import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createPurchaseOrderSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

const PURCHASE_ORDER_PREFIX = 'PO-';

const getNextPurchaseOrderNumber = async (tx: TransactionClient) => {
  const latest = await tx.purchaseOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });

  const lastDigits = latest?.orderNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.purchaseOrder.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${PURCHASE_ORDER_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/purchase-orders
 * List purchase orders
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'purchase_order.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
    };

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          items: { include: { product: true } },
          createdByUser: true,
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        items: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get purchase orders error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/purchase-orders
 * Create a purchase order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'purchase_order.create');
    const body = await request.json();
    const parsed = createPurchaseOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { supplierId, items, tax = 0, expectedDate, notes } = parsed.data;

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        createErrorResponse('Some products not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const orderNumber = await getNextPurchaseOrderNumber(tx);

      let subtotal = new Decimal(0);
      const itemsPayload = items.map((item) => {
        const totalCost = new Decimal(item.unitCost).mul(item.quantity);
        subtotal = subtotal.plus(totalCost);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: totalCost.toNumber(),
        };
      });

      const taxAmount = subtotal.mul(new Decimal(tax)).div(100);
      const totalAmount = subtotal.plus(taxAmount);

      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId,
          subtotal: subtotal.toNumber(),
          tax: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          status: 'DRAFT',
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes: notes || null,
          createdBy: user.userId,
          items: {
            create: itemsPayload,
          },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
      });

      return purchaseOrder;
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_PURCHASE_ORDER',
      entityType: 'PurchaseOrder',
      entityId: result.id,
      description: `Purchase order created: ${result.orderNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { orderNumber: result.orderNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Purchase order created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create purchase order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
