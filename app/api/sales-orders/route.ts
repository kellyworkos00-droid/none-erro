import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createSalesOrderSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

const SALES_ORDER_PREFIX = 'SO-';

const getNextSalesOrderNumber = async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
  const latest = await tx.salesOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { orderNumber: true },
  });

  const lastDigits = latest?.orderNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.salesOrder.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${SALES_ORDER_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/sales-orders
 * List sales orders
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'sales_order.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const customerId = searchParams.get('customerId');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const [orders, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: { include: { product: true } },
          deliveries: true,
        },
      }),
      prisma.salesOrder.count({ where }),
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
    console.error('Get sales orders error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales-orders
 * Create sales order
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'sales_order.create');
    const body = await request.json();
    const parsed = createSalesOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { customerId, items, tax = 0, quoteId, notes } = parsed.data;

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

    if (quoteId) {
      const quote = await prisma.salesQuote.findUnique({
        where: { id: quoteId },
      });

      if (!quote) {
        return NextResponse.json(
          createErrorResponse('Sales quote not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      if (quote.status !== 'ACCEPTED') {
        return NextResponse.json(
          createErrorResponse('Sales quote must be accepted', 'INVALID_STATE'),
          { status: 400 }
        );
      }

      if (quote.customerId !== customerId) {
        return NextResponse.json(
          createErrorResponse('Customer does not match quote', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const orderNumber = await getNextSalesOrderNumber(tx);

      let subtotal = new Decimal(0);
      const itemsPayload = items.map((item) => {
        const totalPrice = new Decimal(item.unitPrice).mul(item.quantity);
        subtotal = subtotal.plus(totalPrice);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          totalPrice: totalPrice.toNumber(),
        };
      });

      const taxAmount = subtotal.mul(new Decimal(tax)).div(100);
      const totalAmount = subtotal.plus(taxAmount);

      return tx.salesOrder.create({
        data: {
          orderNumber,
          customerId,
          quoteId: quoteId || null,
          subtotal: subtotal.toNumber(),
          tax: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          status: 'DRAFT',
          approvalStatus: 'NOT_SUBMITTED',
          notes: notes || null,
          createdBy: user.userId,
          items: {
            create: itemsPayload,
          },
        },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });
    });

    await createAuditLog({
      userId: user.userId,
      action: 'CREATE_SALES_ORDER',
      entityType: 'SalesOrder',
      entityId: result.id,
      description: `Sales order created: ${result.orderNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { orderNumber: result.orderNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Sales order created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create sales order error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
