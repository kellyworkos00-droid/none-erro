import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import type { TransactionClient } from '@/lib/types';

/**
 * GET /api/sales-quotes/:id
 * Get a sales quote
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requirePermission(request, 'sales_quote.view');

    const quote = await prisma.salesQuote.findUnique({
      where: { id: context.params.id },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
    });

    if (!quote) {
      return NextResponse.json(
        createErrorResponse('Sales quote not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json(createSuccessResponse(quote), { status: 200 });
  } catch (error) {
    console.error('Get sales quote error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/sales-quotes/:id
 * Update sales quote status
 */
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = (body?.action as string | undefined)?.toUpperCase() || '';

    const permissionMap = {
      SEND: 'sales_quote.send',
      ACCEPT: 'sales_quote.accept',
      DECLINE: 'sales_quote.decline',
    } as const;

    type Action = keyof typeof permissionMap;

    const permission = permissionMap[action as Action];
    if (!permission) {
      return NextResponse.json(
        createErrorResponse('Invalid action', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const user = await requirePermission(request, permission);

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const quote = await tx.salesQuote.findUnique({
        where: { id: context.params.id },
      });

      if (!quote) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (action === 'SEND' && quote.status !== 'DRAFT') {
        return { error: 'INVALID_STATE' } as const;
      }

      if ((action === 'ACCEPT' || action === 'DECLINE') && quote.status !== 'SENT') {
        return { error: 'INVALID_STATE' } as const;
      }

      const statusMap: Record<Action, string> = {
        SEND: 'SENT',
        ACCEPT: 'ACCEPTED',
        DECLINE: 'DECLINED',
      };

      const updatedQuote = await tx.salesQuote.update({
        where: { id: quote.id },
        data: { status: statusMap[action as Action] },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      return { quote: updatedQuote } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Sales quote not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createErrorResponse('Sales quote cannot be updated', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    const auditActionMap: Record<Action, 'SALES_QUOTE_SEND' | 'SALES_QUOTE_ACCEPT' | 'SALES_QUOTE_DECLINE'> = {
      SEND: 'SALES_QUOTE_SEND',
      ACCEPT: 'SALES_QUOTE_ACCEPT',
      DECLINE: 'SALES_QUOTE_DECLINE',
    };

    await createAuditLog({
      userId: user.userId,
      action: auditActionMap[action as Action],
      entityType: 'SalesQuote',
      entityId: result.quote.id,
      description: `Sales quote ${action.toLowerCase()}: ${result.quote.quoteNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { quoteNumber: result.quote.quoteNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result.quote, `Sales quote ${action.toLowerCase()}`),
      { status: 200 }
    );
  } catch (error) {
    console.error('Update sales quote error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
