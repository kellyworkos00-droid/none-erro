import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import Decimal from 'decimal.js';
import type { TransactionClient } from '@/lib/types';



/**
 * POST /api/customer-payments
 * Record a customer payment against an invoice
 * Updates invoice status based on remaining balance
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'payment.create');
    const body = await request.json();

    const { invoiceId, amount, paymentDate, paymentMethod, reference } = body;

    if (!invoiceId || !amount) {
      return NextResponse.json(
        createErrorResponse('Invoice ID and amount are required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const paymentAmount = new Decimal(amount);
    if (paymentAmount.lte(0)) {
      return NextResponse.json(
        createErrorResponse('Payment amount must be greater than 0', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true },
      });

      if (!invoice) {
        return { error: 'NOT_FOUND' } as const;
      }

      if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
        return { error: 'ALREADY_PAID' } as const;
      }

      // Calculate new payment amounts
      const currentBalance = new Decimal(invoice.balanceAmount);
      const newPaidAmount = new Decimal(invoice.paidAmount).plus(paymentAmount);
      const newBalanceAmount = currentBalance.minus(paymentAmount);

      if (newBalanceAmount.lt(0)) {
        return { error: 'OVERPAYMENT' } as const;
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          amount: paymentAmount.toNumber(),
          paymentDate: new Date(paymentDate || new Date()),
          paymentMethod: paymentMethod || 'BANK_TRANSFER',
          reference: reference || invoiceId,
          status: 'CONFIRMED',
        },
      });

      // Determine new invoice status based on balance
      let newStatus = 'SENT';
      if (newBalanceAmount.lte(0)) {
        newStatus = 'PAID';
      } else if (newPaidAmount.gt(0)) {
        newStatus = 'PARTIALLY_PAID';
      }

      // Update invoice with new payment amounts and status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          balanceAmount: Math.max(newBalanceAmount.toNumber(), 0),
          status: newStatus,
        },
        include: { customer: true },
      });

      // Update customer balance
      if (invoice.customer) {
        const newCustomerTotalPaid = new Decimal(invoice.customer.totalPaid).plus(paymentAmount);
        const newCurrentBalance = new Decimal(invoice.customer.totalOutstanding)
          .minus(newCustomerTotalPaid);

        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            totalPaid: newCustomerTotalPaid.toNumber(),
            currentBalance: newCurrentBalance.toNumber(),
          },
        });
      }

      return { payment, invoice: updatedInvoice } as const;
    });

    if ('error' in result) {
      if (result.error === 'NOT_FOUND') {
        return NextResponse.json(
          createErrorResponse('Invoice not found', 'NOT_FOUND'),
          { status: 404 }
        );
      }
      if (result.error === 'ALREADY_PAID') {
        return NextResponse.json(
          createErrorResponse('Invoice is already paid or cancelled', 'INVALID_STATE'),
          { status: 400 }
        );
      }
      if (result.error === 'OVERPAYMENT') {
        return NextResponse.json(
          createErrorResponse('Payment amount exceeds remaining balance', 'VALIDATION_ERROR'),
          { status: 400 }
        );
      }
      // Fallback error
      return NextResponse.json(
        createErrorResponse('Payment processing failed', 'INTERNAL_ERROR'),
        { status: 500 }
      );
    }

    // Record audit log for successful payment
    if (!('error' in result) && result.payment) {
      await createAuditLog({
        userId: user.userId,
        action: 'RECORD_SUPPLIER_PAYMENT',
        entityType: 'Payment',
        entityId: result.payment.id,
        description: `Customer payment recorded: ${result.payment.paymentNumber || result.payment.id}`,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          invoiceId,
          paymentNumber: result.payment.paymentNumber,
          amount: paymentAmount.toNumber(),
        },
      });
    }

    return NextResponse.json(
      createSuccessResponse(
        {
          payment: result.payment,
          invoice: result.invoice,
        },
        'Payment recorded successfully'
      ),
      { status: 201 }
    );
  } catch (error) {
    console.error('Record customer payment error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/customer-payments?invoiceId=xxx
 * Get payments for an invoice
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'invoice.view');

    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json(
        createErrorResponse('Invoice ID is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    const payments = await prisma.payment.findMany({
      where: { invoiceId },
      orderBy: { paymentDate: 'desc' },
    });

    return NextResponse.json(
      createSuccessResponse({ payments }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get customer payments error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
