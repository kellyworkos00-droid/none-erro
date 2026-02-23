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
 * GET /api/suppliers/:id/aging
 * Get supplier aging buckets and balance
 */
export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    await requirePermission(request, 'supplier_bill.view');

    const supplier = await prisma.supplier.findUnique({
      where: { id: context.params.id },
    });

    if (!supplier) {
      return NextResponse.json(
        createErrorResponse('Supplier not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    const bills = await prisma.supplierBill.findMany({
      where: {
        supplierId: context.params.id,
        status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
      select: {
        balanceAmount: true,
        dueDate: true,
      },
    });

    const buckets = buildAgingBuckets(bills);
    const totalBalance = bills.reduce(
      (sum: number, bill: { balanceAmount: number }) => sum + bill.balanceAmount,
      0
    );

    return NextResponse.json(
      createSuccessResponse({
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalBalance,
        buckets,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Supplier aging error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
