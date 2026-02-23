import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/reconciliation/transactions
 * Get bank transactions with filters
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'reconciliation.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const skip = (page - 1) * limit;

    // Build where clause
    const transactionDate = {
      ...(startDate ? { gte: new Date(startDate) } : {}),
      ...(endDate ? { lte: new Date(endDate) } : {}),
    };

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(Object.keys(transactionDate).length > 0 ? { transactionDate } : {}),
    };

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transactionDate: 'desc' },
        include: {
          payments: {
            include: {
              customer: true,
              invoice: true,
            },
          },
          reconciliationLog: true,
        },
      }),
      prisma.bankTransaction.count({ where }),
    ]);

    return NextResponse.json(
      createSuccessResponse({
        transactions,
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
    console.error('Get transactions error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
