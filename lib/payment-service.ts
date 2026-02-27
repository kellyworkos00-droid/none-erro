/**
 * Payment Recording Service
 * Handles multiple ways to record payments against invoices
 */

import prisma from '@/lib/prisma';
import Decimal from 'decimal.js';
import { calculateInvoiceStatus, validatePaymentAmount } from '@/lib/payment-methods';
import type { TransactionClient } from '@/lib/types';

/**
 * Payment Recording Options
 */
export interface PaymentRecordOptions {
  userId: string;
  invoiceId?: string;
  customerId?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: Date;
  reference?: string;
  notes?: string;
  chequeNumber?: string;
  bankCode?: string;
  bankName?: string;
  paymentGatewayId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Bulk Payment Recording Options
 */
export interface BulkPaymentRecordOptions {
  userId: string;
  payments: Array<{
    invoiceId?: string;
    customerId?: string;
    amount: number;
  }>;
  paymentMethod: string;
  paymentDate: Date;
  reference?: string;
  notes?: string;
}

/**
 * Payment Recording Result
 */
export interface PaymentRecordResult {
  success: boolean;
  paymentId?: string;
  invoiceId?: string;
  message: string;
  invoiceStatus?: string;
  remainingBalance?: number;
  error?: string;
}

/**
 * Record a single payment
 */
export async function recordPayment(
  options: PaymentRecordOptions
): Promise<PaymentRecordResult> {
  try {
    // Validate input
    if (!options.invoiceId && !options.customerId) {
      return {
        success: false,
        message: 'Either invoiceId or customerId is required',
        error: 'MISSING_IDENTIFIER',
      };
    }

    if (options.amount <= 0) {
      return {
        success: false,
        message: 'Payment amount must be greater than 0',
        error: 'INVALID_AMOUNT',
      };
    }

    // Record payment in transaction
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      let invoice;

      if (options.invoiceId) {
        // Find invoice
        invoice = await tx.invoice.findUnique({
          where: { id: options.invoiceId },
          include: { customer: true },
        });

        if (!invoice) {
          return {
            success: false,
            message: 'Invoice not found',
            error: 'INVOICE_NOT_FOUND',
          };
        }

        // Validate payment amount
        const validation = validatePaymentAmount(
          options.amount,
          invoice.totalAmount,
          invoice.paidAmount,
          false
        );

        if (!validation.valid) {
          return {
            success: false,
            message: validation.error,
            error: 'INVALID_PAYMENT_AMOUNT',
          };
        }

        // Check if already paid
        if (invoice.status === 'PAID') {
          return {
            success: false,
            message: 'Invoice is already paid',
            error: 'ALREADY_PAID',
          };
        }
      }

      // Create payment record
      const payment = await tx.payment.create({
        data: {
          invoiceId: options.invoiceId,
          customerId: options.customerId || invoice!.customerId,
          amount: options.amount,
          paymentDate: options.paymentDate,
          paymentMethod: options.paymentMethod,
          reference: options.reference || `PAY-${Date.now()}`,
          status: 'CONFIRMED',
          notes: options.notes,
          metadata: options.metadata
            ? JSON.stringify({
                ...options.metadata,
                chequeNumber: options.chequeNumber,
                bankCode: options.bankCode,
                bankName: options.bankName,
                paymentGatewayId: options.paymentGatewayId,
              })
            : undefined,
        },
      });

      // Update invoice if present
      if (invoice) {
        const newPaidAmount = new Decimal(invoice.paidAmount).plus(options.amount);
        const newBalanceAmount = new Decimal(invoice.totalAmount).minus(newPaidAmount);

        const newStatus = calculateInvoiceStatus(
          invoice.totalAmount,
          newPaidAmount.toNumber(),
          invoice.dueDate,
          invoice.status
        );

        await tx.invoice.update({
          where: { id: options.invoiceId },
          data: {
            paidAmount: newPaidAmount.toNumber(),
            balanceAmount: Math.max(newBalanceAmount.toNumber(), 0),
            status: newStatus,
            ...(newStatus === 'PAID' && { paidDate: new Date() }),
          },
        });

        return {
          success: true,
          paymentId: payment.id,
          invoiceId: invoice.id,
          message: 'Payment recorded successfully',
          invoiceStatus: newStatus,
          remainingBalance: Math.max(newBalanceAmount.toNumber(), 0),
        };
      }

      return {
        success: true,
        paymentId: payment.id,
        customerId: options.customerId,
        message: 'Payment recorded successfully',
      };
    });

    return result as PaymentRecordResult;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record payment',
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Record bulk payments (multiple invoices or customers in one transaction)
 */
export async function recordBulkPayments(
  options: BulkPaymentRecordOptions
): Promise<Array<PaymentRecordResult>> {
  const results: PaymentRecordResult[] = [];

  for (const payment of options.payments) {
    const result = await recordPayment({
      userId: options.userId,
      invoiceId: payment.invoiceId,
      customerId: payment.customerId,
      amount: payment.amount,
      paymentMethod: options.paymentMethod,
      paymentDate: options.paymentDate,
      reference: options.reference,
      notes: options.notes,
    });

    results.push(result);
  }

  return results;
}

/**
 * Record payment from bank statement match
 */
export async function recordPaymentFromBankTransaction(
  userId: string,
  invoiceId: string,
  bankTransactionId: string,
  amount: number
): Promise<PaymentRecordResult> {
  try {
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const bankTransaction = await tx.bankTransaction.findUnique({
        where: { id: bankTransactionId },
      });

      if (!bankTransaction) {
        return {
          success: false,
          message: 'Bank transaction not found',
          error: 'BANK_TRANSACTION_NOT_FOUND',
        };
      }

      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        return {
          success: false,
          message: 'Invoice not found',
          error: 'INVOICE_NOT_FOUND',
        };
      }

      // Validate amount
      const validation = validatePaymentAmount(
        amount,
        invoice.totalAmount,
        invoice.paidAmount
      );

      if (!validation.valid) {
        return {
          success: false,
          message: validation.error,
          error: 'INVALID_AMOUNT',
        };
      }

      // Create payment linked to bank transaction
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          customerId: invoice.customerId,
          bankTransactionId,
          amount,
          paymentDate: bankTransaction.transactionDate,
          paymentMethod: 'BANK_TRANSFER',
          reference: bankTransaction.reference,
          status: 'CONFIRMED',
          isReconciled: true,
          reconciledAt: new Date(),
          reconciledBy: userId,
        },
      });

      // Update invoice
      const newPaidAmount = new Decimal(invoice.paidAmount).plus(amount);
      const newBalanceAmount = new Decimal(invoice.totalAmount).minus(newPaidAmount);

      const newStatus = calculateInvoiceStatus(
        invoice.totalAmount,
        newPaidAmount.toNumber(),
        invoice.dueDate,
        invoice.status
      );

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          balanceAmount: Math.max(newBalanceAmount.toNumber(), 0),
          status: newStatus,
          ...(newStatus === 'PAID' && { paidDate: new Date() }),
        },
      });

      // Update bank transaction status
      await tx.bankTransaction.update({
        where: { id: bankTransactionId },
        data: {
          status: 'MATCHED',
          matchedAt: new Date(),
          matchedBy: userId,
        },
      });

      return {
        success: true,
        paymentId: payment.id,
        invoiceId,
        message: 'Payment recorded from bank transaction',
        invoiceStatus: newStatus,
        remainingBalance: Math.max(newBalanceAmount.toNumber(), 0),
      };
    });

    return result as PaymentRecordResult;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record payment',
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Record partial payment (multiple partial payments allowed)
 */
export async function recordPartialPayment(
  userId: string,
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  reference?: string
): Promise<PaymentRecordResult> {
  return recordPayment({
    userId,
    invoiceId,
    amount,
    paymentMethod,
    paymentDate: new Date(),
    reference,
    notes: `Partial payment recorded by ${userId}`,
  });
}

/**
 * Record a refund
 */
export async function recordRefund(
  userId: string,
  paymentId: string,
  reason: string
): Promise<PaymentRecordResult> {
  try {
    const result = await prisma.$transaction(async (tx: TransactionClient) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { invoice: true },
      });

      if (!payment) {
        return {
          success: false,
          message: 'Payment not found',
          error: 'PAYMENT_NOT_FOUND',
        };
      }

      if (payment.status !== 'CONFIRMED') {
        return {
          success: false,
          message: 'Only confirmed payments can be refunded',
          error: 'INVALID_PAYMENT_STATUS',
        };
      }

      // Create refund record as negative payment
      const refund = await tx.payment.create({
        data: {
          invoiceId: payment.invoiceId,
          customerId: payment.customerId,
          amount: -payment.amount,
          paymentDate: new Date(),
          paymentMethod: payment.paymentMethod,
          reference: `REFUND-${paymentId}`,
          status: 'REFUNDED',
          notes: `Refund: ${reason}`,
        },
      });

      // Update original payment
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });

      // Update invoice if needed
      if (payment.invoice) {
        const newPaidAmount = new Decimal(payment.invoice.paidAmount).minus(payment.amount);
        const newBalanceAmount = new Decimal(payment.invoice.totalAmount).minus(newPaidAmount);

        const newStatus = calculateInvoiceStatus(
          payment.invoice.totalAmount,
          newPaidAmount.toNumber(),
          payment.invoice.dueDate,
          payment.invoice.status
        );

        await tx.invoice.update({
          where: { id: payment.invoice.id },
          data: {
            paidAmount: Math.max(newPaidAmount.toNumber(), 0),
            balanceAmount: newBalanceAmount.toNumber(),
            status: newStatus,
            paidDate: newStatus === 'PAID' ? new Date() : null,
          },
        });
      }

      return {
        success: true,
        paymentId: refund.id,
        message: 'Refund recorded successfully',
      };
    });

    return result as PaymentRecordResult;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record refund',
      error: 'INTERNAL_ERROR',
    };
  }
}

/**
 * Get invoice payment history
 */
export async function getPaymentHistory(invoiceId: string) {
  return prisma.payment.findMany({
    where: { invoiceId },
    orderBy: { paymentDate: 'desc' },
    include: {
      reconciledByUser: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });
}

/**
 * Get customer payment summary
 */
export async function getCustomerPaymentSummary(customerId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { customerId },
    include: {
      payments: true,
    },
  });

  const totalAmount = invoices.reduce((sum: number, inv: { totalAmount: number }) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum: number, inv: { paidAmount: number }) => sum + inv.paidAmount, 0);
  const totalOutstanding = totalAmount - totalPaid;

  const paidCount = invoices.filter((inv: { status: string }) => inv.status === 'PAID').length;
  const unpaidCount = invoices.filter(
    (inv: { status: string }) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'
  ).length;

  return {
    totalInvoices: invoices.length,
    paidInvoices: paidCount,
    unpaidInvoices: unpaidCount,
    totalAmount,
    totalPaid,
    totalOutstanding,
    avgPaymentDays: calculateAvgPaymentDays(invoices),
  };
}

/**
 * Calculate average days to payment
 */
function calculateAvgPaymentDays(
  invoices: Array<{
    issueDate: Date;
    paidDate: Date | null;
    status: string;
  }>
): number {
  const paidInvoices = invoices.filter(
    (inv) => inv.status === 'PAID' && inv.paidDate
  );

  if (paidInvoices.length === 0) return 0;

  const totalDays = paidInvoices.reduce((sum, inv) => {
    const days = Math.floor(
      (inv.paidDate!.getTime() - inv.issueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return sum + days;
  }, 0);

  return Math.round(totalDays / paidInvoices.length);
}
