import { NextRequest, NextResponse } from 'next/server';
import Decimal from 'decimal.js';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createSalesQuoteSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

const SALES_QUOTE_PREFIX = 'SQ-';

const getNextSalesQuoteNumber = async (tx: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
  const latest = await tx.salesQuote.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true },
  });

  const lastDigits = latest?.quoteNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.salesQuote.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${SALES_QUOTE_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * GET /api/sales-quotes
 * List sales quotes
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'sales_quote.view');

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

    const [quotes, total] = await Promise.all([
      prisma.salesQuote.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      }),
      prisma.salesQuote.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        items: quotes,
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
    console.error('Get sales quotes error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales-quotes
 * Create sales quote
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'sales_quote.create');
    const body = await request.json();
    const parsed = createSalesQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { customerId, items, tax = 0, validUntil, notes } = parsed.data;

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
      const quoteNumber = await getNextSalesQuoteNumber(tx);

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

      return tx.salesQuote.create({
        data: {
          quoteNumber,
          customerId,
          subtotal: subtotal.toNumber(),
          tax: taxAmount.toNumber(),
          totalAmount: totalAmount.toNumber(),
          status: 'DRAFT',
          validUntil: validUntil ? new Date(validUntil) : null,
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
      action: 'CREATE_SALES_QUOTE',
      entityType: 'SalesQuote',
      entityId: result.id,
      description: `Sales quote created: ${result.quoteNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { quoteNumber: result.quoteNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Sales quote created successfully'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Create sales quote error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
