import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { verifyToken } from '@/lib/auth';
import Decimal from 'decimal.js';
import { postInvoiceCreated, postPaymentReceived } from '@/lib/accounting';
import type { TransactionClient } from '@/lib/types';

const WALKIN_CUSTOMER_CODE = 'CUST-WALKIN';

const INVOICE_PREFIX = 'INV-';

const getNextInvoiceNumber = async (tx: TransactionClient) => {
  const latest = await tx.invoice.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });

  const lastDigits = latest?.invoiceNumber?.match(/(\d+)$/)?.[1];
  const lastValue = lastDigits ? parseInt(lastDigits, 10) : 0;
  const count = await tx.invoice.count();
  const nextValue = Math.max(lastValue, count) + 1;

  return `${INVOICE_PREFIX}${nextValue.toString().padStart(6, '0')}`;
};

const getOrCreateWalkInCustomer = async (tx: TransactionClient) => {
  const existing = await tx.customer.findUnique({
    where: { customerCode: WALKIN_CUSTOMER_CODE },
  });

  if (existing) return existing;

  return tx.customer.create({
    data: {
      customerCode: WALKIN_CUSTOMER_CODE,
      name: 'Walk-in Customer',
      isActive: true,
    },
  });
};

/**
 * POST /api/pos/checkout
 * Complete a POS order (change status from DRAFT to COMPLETED)
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        createErrorResponse('Unauthorized', 'UNAUTHORIZED'),
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        createErrorResponse('Invalid token', 'INVALID_TOKEN'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { orderId, paymentMethod, amountPaid } = body;

    if (!orderId) {
      return NextResponse.json(
        createErrorResponse('Order ID is required', 'VALIDATION_ERROR'),
        { status: 400 }
      );
    }

    // Get the order
    const order = await prisma.posOrder.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      return NextResponse.json(
        createErrorResponse('Order not found', 'NOT_FOUND'),
        { status: 404 }
      );
    }

    if (order.status !== 'DRAFT') {
      return NextResponse.json(
        createErrorResponse('Order cannot be completed', 'INVALID_STATE'),
        { status: 400 }
      );
    }

    // Determine payment status
    const paymentAmount = amountPaid || order.totalAmount;
    let paymentStatus = 'PENDING';
    if (paymentAmount >= order.totalAmount) {
      paymentStatus = 'PAID';
    } else if (paymentAmount > 0) {
      paymentStatus = 'PARTIALLY_PAID';
    }

    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const finalCustomerId = order.customerId
        ? order.customerId
        : (await getOrCreateWalkInCustomer(tx)).id;

      const customer = await tx.customer.findUnique({
        where: { id: finalCustomerId },
      });

      if (!customer) {
        throw new Error('Customer not found');
      }

      // Update product quantities
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      const invoiceNumber = await getNextInvoiceNumber(tx);
      const issueDate = new Date();

      // Calculate initial status based on payment
      let initialStatus = 'SENT';
      if (paymentAmount >= order.totalAmount) {
        initialStatus = 'PAID';
      } else if (paymentAmount > 0) {
        initialStatus = 'PARTIALLY_PAID';
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: finalCustomerId,
          subtotal: order.subtotal,
          taxAmount: order.tax,
          totalAmount: order.totalAmount,
          paidAmount: paymentAmount,
          balanceAmount: Math.max(order.totalAmount - paymentAmount, 0),
          status: initialStatus,
          issueDate,
          dueDate: issueDate,
          description: `POS sale for order ${order.orderNumber}`,
        },
      });

      const payment = paymentAmount > 0
        ? await tx.payment.create({
          data: {
            customerId: finalCustomerId,
            invoiceId: invoice.id,
            amount: paymentAmount,
            paymentDate: issueDate,
            paymentMethod: paymentMethod || 'CASH',
            reference: `POS-${order.orderNumber}`,
            status: 'CONFIRMED',
          },
        })
        : null;

      const updatedTotalOutstanding = new Decimal(customer.totalOutstanding)
        .plus(order.totalAmount);
      const updatedTotalPaid = new Decimal(customer.totalPaid)
        .plus(paymentAmount);
      const updatedCurrentBalance = updatedTotalOutstanding
        .minus(updatedTotalPaid);

      await tx.customer.update({
        where: { id: finalCustomerId },
        data: {
          totalOutstanding: updatedTotalOutstanding.toNumber(),
          totalPaid: updatedTotalPaid.toNumber(),
          currentBalance: updatedCurrentBalance.toNumber(),
        },
      });

      const completedOrder = await tx.posOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: paymentMethod || null,
          amountPaid: paymentAmount,
          paymentStatus,
          completedAt: new Date(),
          customerId: finalCustomerId,
          invoiceId: invoice.id,
        },
        include: {
          customer: true,
          invoice: true,
          orderItems: {
            include: { product: true },
          },
          createdByUser: true,
        },
      });

      return { completedOrder, invoice, payment };
    });

    try {
      await postInvoiceCreated(
        result.invoice.id,
        result.invoice.customerId,
        result.invoice.totalAmount,
        payload.userId,
        `POS sale for order ${result.completedOrder.orderNumber}`,
        result.invoice.issueDate
      );

      if (result.payment) {
        await postPaymentReceived(
          result.payment.id,
          result.invoice.customerId,
          result.invoice.id,
          result.payment.amount,
          payload.userId,
          `POS payment for order ${result.completedOrder.orderNumber}`,
          result.payment.paymentDate
        );
      }
    } catch (ledgerError) {
      console.error('Ledger posting failed for POS sale:', ledgerError);
    }

    return NextResponse.json(
      createSuccessResponse(result.completedOrder, 'Order completed successfully')
    );
  } catch (error) {
    console.error('Failed to checkout order:', error);
    return NextResponse.json(
      createErrorResponse('Failed to checkout order', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
