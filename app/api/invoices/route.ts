import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/invoices
 * Get all invoices with pagination and filters
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'invoice.view');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      ...(customerId ? { customerId } : {}),
      ...(status ? { status } : {}),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issueDate: 'desc' },
        include: {
          customer: true,
          payments: true,
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    // Calculate accurate status for each invoice based on actual payment amounts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoicesWithAccurateStatus = (invoices as any[]).map((invoice) => {
      let calculatedStatus = 'SENT';
      // Only mark as PAID if payment is confirmed in invoice module
      if (invoice.payments && invoice.payments.length > 0) {
        const confirmedPayments = invoice.payments.filter((p: { status: string }) => p.status === 'CONFIRMED');
        const totalConfirmed = confirmedPayments.reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);
        if (totalConfirmed >= invoice.totalAmount) {
          calculatedStatus = 'PAID';
        } else if (totalConfirmed > 0) {
          calculatedStatus = 'PARTIALLY_PAID';
        }
      }
      return {
        ...invoice,
        status: calculatedStatus,
      };
    });

    return NextResponse.json(
      createSuccessResponse({
        invoices: invoicesWithAccurateStatus,
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
    console.error('Get invoices error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
