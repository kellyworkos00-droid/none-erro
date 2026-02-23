import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

const buildAgingBuckets = (bills: { balanceAmount: number; dueDate: Date }[]) => {
  const buckets = {
    current: 0,
    days1to30: 0,
    days31to60: 0,
    days61to90: 0,
    days90plus: 0,
  };

  const today = new Date();

  for (const bill of bills) {
    const daysPastDue = Math.floor(
      (today.getTime() - new Date(bill.dueDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysPastDue <= 0) {
      buckets.current += bill.balanceAmount;
    } else if (daysPastDue <= 30) {
      buckets.days1to30 += bill.balanceAmount;
    } else if (daysPastDue <= 60) {
      buckets.days31to60 += bill.balanceAmount;
    } else if (daysPastDue <= 90) {
      buckets.days61to90 += bill.balanceAmount;
    } else {
      buckets.days90plus += bill.balanceAmount;
    }
  }

  return buckets;
};

/**
 * GET /api/suppliers/aging
 * Supplier aging summary
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'supplier_bill.view');

    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const rows = await Promise.all(
      suppliers.map(async (supplier: { id: string; name: string }) => {
        const bills = await prisma.supplierBill.findMany({
          where: {
            supplierId: supplier.id,
            status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
          select: { balanceAmount: true, dueDate: true },
        });

        const buckets = buildAgingBuckets(bills);
        const totalBalance = bills.reduce(
          (sum: number, bill: { balanceAmount: number }) => sum + bill.balanceAmount,
          0
        );

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          totalBalance,
          buckets,
        };
      })
    );

    return NextResponse.json(createSuccessResponse({ rows }), { status: 200 });
  } catch (error) {
    console.error('Supplier aging summary error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
