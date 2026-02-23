import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createSupplierPaymentSchema } from '@/lib/validations';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import Decimal from 'decimal.js';
import type { TransactionClient } from '@/lib/types';

const PAYMENT_PREFIX = 'SUPPAY-';

const getNextPaymentNumber = async (tx: TransactionClient) => {
  const latest = await tx.supplierPayment.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { paymentNumber: true },
  });

  const lastDigits = latest?.paymentNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.supplierPayment.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${PAYMENT_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

/**
 * POST /api/supplier-payments
 * Record supplier payment
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'supplier_bill.pay');
    const body = await request.json();
    const parsed = createSupplierPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { billId, amount, paymentDate, paymentMethod, reference, notes } = parsed.data;

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const bill = await tx.supplierBill.findUnique({
        where: { id: billId },
      });

      if (!bill) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (bill.status === 'PAID' || bill.status === 'CANCELLED') {
        return { error: 'INVALID_STATE' } as const;
      }

      const paymentNumber = await getNextPaymentNumber(tx);
      const paidAmount = new Decimal(bill.paidAmount).plus(amount);
      const balanceAmount = new Decimal(bill.totalAmount).minus(paidAmount);

      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId: bill.supplierId,
          billId: bill.id,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMethod: paymentMethod || null,
          reference: reference || null,
          notes: notes || null,
          createdBy: user.userId,
        },
      });

      const nextStatus = balanceAmount.lte(0)
        ? 'PAID'
        : paidAmount.gt(0)
          ? 'PARTIALLY_PAID'
          : 'OPEN';

      const updatedBill = await tx.supplierBill.update({
        where: { id: bill.id },
        data: {
          paidAmount: paidAmount.toNumber(),
          balanceAmount: Math.max(balanceAmount.toNumber(), 0),
          status: nextStatus,
        },
      });

      return { payment, bill: updatedBill } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Supplier bill not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }

      return NextResponse.json(
        createErrorResponse('Supplier bill cannot be paid', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    await createAuditLog({
      userId: user.userId,
      action: 'RECORD_SUPPLIER_PAYMENT',
      entityType: 'SupplierPayment',
      entityId: result.payment.id,
      description: `Supplier payment recorded: ${result.payment.paymentNumber}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { paymentNumber: result.payment.paymentNumber },
    });

    return NextResponse.json(
      createSuccessResponse(result, 'Supplier payment recorded'),
      { status: 201 }
    );
  } catch (error) {
    console.error('Record supplier payment error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
