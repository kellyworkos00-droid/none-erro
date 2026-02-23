import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

const toDate = (value: string | null, fallback: Date) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

/**
 * GET /api/reports/overview
 * Revenue, expenses, cashflow, and AR/AP summary for a period
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'reports.view');

    const { searchParams } = new URL(request.url);
    const end = toDate(searchParams.get('end'), new Date());
    const start = toDate(searchParams.get('start'), new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000));

    const startDate = new Date(start.setHours(0, 0, 0, 0));
    const endDate = new Date(end.setHours(23, 59, 59, 999));

    const [paymentsSum, expenseSum, supplierPaymentsSum, arSum, apSum] = await Promise.all([
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: startDate, lte: endDate },
          status: { in: ['CONFIRMED', 'RECONCILED'] },
        },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { expenseDate: { gte: startDate, lte: endDate } },
      }),
      prisma.supplierPayment.aggregate({
        _sum: { amount: true },
        where: { paymentDate: { gte: startDate, lte: endDate } },
      }),
      prisma.invoice.aggregate({
        _sum: { balanceAmount: true },
        where: {
          balanceAmount: { gt: 0 },
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
      }),
      prisma.supplierBill.aggregate({
        _sum: { balanceAmount: true },
        where: {
          balanceAmount: { gt: 0 },
          status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
      }),
    ]);

    const revenue = paymentsSum._sum.amount || 0;
    const expenses = expenseSum._sum.amount || 0;
    const supplierPayments = supplierPaymentsSum._sum.amount || 0;
    const cashOut = expenses + supplierPayments;

    const payload = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      revenue,
      expenses,
      supplierPayments,
      netIncome: revenue - expenses - supplierPayments,
      cashIn: revenue,
      cashOut,
      netCashflow: revenue - cashOut,
      arOutstanding: arSum._sum.balanceAmount || 0,
      apOutstanding: apSum._sum.balanceAmount || 0,
    };

    return NextResponse.json(createSuccessResponse(payload));
  } catch (error) {
    console.error('Reports overview error:', error);
    return NextResponse.json(
      createErrorResponse('Failed to load reports', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
