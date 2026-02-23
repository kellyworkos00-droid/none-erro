import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

const toDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const buildBuckets = () => ({
  current: 0,
  days1to30: 0,
  days31to60: 0,
  days61to90: 0,
  days90plus: 0,
});

const addToBuckets = (buckets: ReturnType<typeof buildBuckets>, daysPastDue: number, amount: number) => {
  if (daysPastDue <= 0) {
    buckets.current += amount;
  } else if (daysPastDue <= 30) {
    buckets.days1to30 += amount;
  } else if (daysPastDue <= 60) {
    buckets.days31to60 += amount;
  } else if (daysPastDue <= 90) {
    buckets.days61to90 += amount;
  } else {
    buckets.days90plus += amount;
  }
};

/**
 * GET /api/reports/aging
 * AR/AP aging buckets as of a date
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'reports.view');

    const { searchParams } = new URL(request.url);
    const asOf = toDate(searchParams.get('asOf'), new Date());
    const asOfDate = new Date(asOf.setHours(23, 59, 59, 999));

    const [invoices, bills] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          balanceAmount: { gt: 0 },
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        select: { dueDate: true, balanceAmount: true },
      }),
      prisma.supplierBill.findMany({
        where: {
          balanceAmount: { gt: 0 },
          status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        select: { dueDate: true, balanceAmount: true },
      }),
    ]);

    const ar = buildBuckets();
    for (const invoice of invoices) {
      const daysPastDue = Math.floor(
        (asOfDate.getTime() - new Date(invoice.dueDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      addToBuckets(ar, daysPastDue, invoice.balanceAmount);
    }

    const ap = buildBuckets();
    for (const bill of bills) {
      const daysPastDue = Math.floor(
        (asOfDate.getTime() - new Date(bill.dueDate).getTime()) / (24 * 60 * 60 * 1000)
      );
      addToBuckets(ap, daysPastDue, bill.balanceAmount);
    }

    return NextResponse.json(
      createSuccessResponse({
        asOf: asOfDate.toISOString(),
        ar,
        ap,
      })
    );
  } catch (error) {
    console.error('Reports aging error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to load aging report', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
