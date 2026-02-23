/**
 * Bank Statement Reconciliation Matching Engine
 * 
 * Production-grade matching logic for automatically reconciling
 * bank transactions to customers and invoices.
 * 
 * Matching strategies:
 * 1. Exact invoice number match
 * 2. Exact customer code match
 * 3. Amount + customer fuzzy match
 * 4. Reference pattern matching
 */

import prisma from './prisma';
import type { TransactionClient } from './types';
import { postPaymentReceived } from './accounting';
import { decimal } from './utils';
import Decimal from 'decimal.js';

export interface MatchResult {
  success: boolean;
  matchType: 'EXACT' | 'FUZZY' | 'PARTIAL' | 'NONE';
  confidence: number; // 0-100
  customerId?: string;
  invoiceId?: string;
  matchedAmount?: number;
  reason?: string;
}

/**
 * Attempt to automatically match a bank transaction
 * 
 * @param bankTransactionId - Bank transaction to match
 * @returns Match result with customer/invoice if found
 */
export async function autoMatchTransaction(
  bankTransactionId: string
): Promise<MatchResult> {
  const transaction = await prisma.bankTransaction.findUnique({
    where: { id: bankTransactionId },
  });

  if (!transaction) {
    throw new Error('Bank transaction not found');
  }

  if (transaction.status !== 'PENDING') {
    throw new Error('Transaction has already been processed');
  }

  const reference = transaction.reference.toUpperCase().trim();
  const amount = new Decimal(transaction.amount);

  // Strategy 1: Try to extract and match invoice number
  const invoiceMatch = reference.match(/INV[- ]?(\d{4}[- ]?\d{4})/i);
  if (invoiceMatch) {
    const invoiceNumber = invoiceMatch[0].replace(/[- ]/g, '-').toUpperCase();
    const invoice = await prisma.invoice.findFirst({
      where: {
        invoiceNumber: {
          contains: invoiceNumber,
        },
        status: {
          in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      include: { customer: true },
    });

    if (invoice) {
      // Verify amount matches (within tolerance)
      const balanceAmount = new Decimal(invoice.balanceAmount);
      const tolerance = balanceAmount.mul(0.01); // 1% tolerance

      if (amount.sub(balanceAmount).abs().lte(tolerance)) {
        return {
          success: true,
          matchType: 'EXACT',
          confidence: 95,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          matchedAmount: amount.toNumber(),
          reason: `Matched invoice number ${invoice.invoiceNumber}`,
        };
      } else if (amount.lte(balanceAmount)) {
        return {
          success: true,
          matchType: 'PARTIAL',
          confidence: 90,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          matchedAmount: amount.toNumber(),
          reason: `Partial payment for invoice ${invoice.invoiceNumber}`,
        };
      }
    }
  }

  // Strategy 2: Try to match customer code
  const customerCodeMatch = reference.match(/CUST[- ]?(\d{4})/i);
  if (customerCodeMatch) {
    const customerCode = customerCodeMatch[0].replace(/[- ]/g, '-').toUpperCase();
    const customer = await prisma.customer.findFirst({
      where: {
        customerCode: {
          equals: customerCode,
        },
        isActive: true,
      },
    });

    if (customer) {
      // Find oldest unpaid invoice for this customer
      const invoice = await prisma.invoice.findFirst({
        where: {
          customerId: customer.id,
          status: {
            in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      if (invoice) {
        const balanceAmount = new Decimal(invoice.balanceAmount);
        if (amount.lte(balanceAmount.mul(1.01))) {
          return {
            success: true,
            matchType: 'FUZZY',
            confidence: 80,
            customerId: customer.id,
            invoiceId: invoice.id,
            matchedAmount: amount.toNumber(),
            reason: `Matched customer ${customer.customerCode}, applied to oldest invoice`,
          };
        }
      }

      // No specific invoice, but customer matched
      return {
        success: true,
        matchType: 'FUZZY',
        confidence: 70,
        customerId: customer.id,
        matchedAmount: amount.toNumber(),
        reason: `Matched customer ${customer.customerCode}, no specific invoice`,
      };
    }
  }

  // Strategy 3: Search for customer by name in reference
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true, customerCode: true },
  });

  for (const customer of customers) {
    const customerNamePattern = customer.name
      .toUpperCase()
      .split(' ')
      .filter((word: string) => word.length > 3); // Only significant words

    const matchedWords = customerNamePattern.filter((word: string) =>
      reference.includes(word)
    );

    if (matchedWords.length > 0 && matchedWords.length >= customerNamePattern.length * 0.5) {
      // Find matching invoice by amount
      const invoice = await prisma.invoice.findFirst({
        where: {
          customerId: customer.id,
          status: {
            in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
          },
          balanceAmount: {
            gte: amount.mul(0.99).toNumber(),
            lte: amount.mul(1.01).toNumber(),
          },
        },
        orderBy: {
          dueDate: 'asc',
        },
      });

      if (invoice) {
        return {
          success: true,
          matchType: 'FUZZY',
          confidence: 65,
          customerId: customer.id,
          invoiceId: invoice.id,
          matchedAmount: amount.toNumber(),
          reason: `Fuzzy matched customer name and amount`,
        };
      }
    }
  }

  // Strategy 4: Amount-based matching for unique amounts
  const matchingInvoices = await prisma.invoice.findMany({
    where: {
      status: {
        in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'],
      },
      balanceAmount: {
        gte: amount.mul(0.99).toNumber(),
        lte: amount.mul(1.01).toNumber(),
      },
    },
    include: { customer: true },
  });

  if (matchingInvoices.length === 1) {
    const invoice = matchingInvoices[0];
    return {
      success: true,
      matchType: 'FUZZY',
      confidence: 60,
      customerId: invoice.customerId,
      invoiceId: invoice.id,
      matchedAmount: amount.toNumber(),
      reason: `Unique amount match: ${invoice.invoiceNumber}`,
    };
  }

  // No match found
  return {
    success: false,
    matchType: 'NONE',
    confidence: 0,
    reason: 'No matching customer or invoice found',
  };
}

/**
 * Process and reconcile a matched transaction
 * Creates payment record and posts to ledger
 * 
 * @param bankTransactionId - Bank transaction ID
 * @param customerId - Matched customer ID
 * @param invoiceId - Matched invoice ID (optional)
 * @param userId - User performing reconciliation
 * @param notes - Additional notes
 */
export async function reconcileTransaction(
  bankTransactionId: string,
  customerId: string,
  invoiceId: string | undefined,
  userId: string,
  notes?: string
) {
  type ReconcileResult = {
    payment: { id: string; reference: string };
    customerId: string;
    invoiceId?: string;
    amount: number;
    paymentDate: Date;
  };

  return await prisma.$transaction(async (tx: TransactionClient) => {
    // Get bank transaction
    const bankTx = await tx.bankTransaction.findUnique({
      where: { id: bankTransactionId },
    });

    if (!bankTx) {
      throw new Error('Bank transaction not found');
    }

    if (bankTx.status !== 'PENDING' && bankTx.status !== 'UNMATCHED') {
      throw new Error('Transaction has already been reconciled');
    }

    // Get customer
    const customer = await tx.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const amount = new Decimal(bankTx.amount);

    // Get invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.customerId !== customerId) {
        throw new Error('Invoice does not belong to the specified customer');
      }
    }

    // Create payment record
    const payment = await tx.payment.create({
      data: {
        customerId,
        invoiceId,
        bankTransactionId,
        amount: amount.toNumber(),
        paymentDate: bankTx.transactionDate,
        paymentMethod: 'BANK_TRANSFER',
        reference: bankTx.reference,
        status: 'CONFIRMED',
        isReconciled: true,
        reconciledAt: new Date(),
        reconciledBy: userId,
        notes,
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

    // Update invoice if provided
    if (invoice) {
      const newPaidAmount = decimal.add(invoice.paidAmount, amount);
      const newBalanceAmount = decimal.subtract(invoice.totalAmount, newPaidAmount);

      let newStatus = invoice.status;
      if (newBalanceAmount.lte(0)) {
        newStatus = 'PAID';
      } else if (newPaidAmount.gt(0)) {
        newStatus = 'PARTIALLY_PAID';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount.toNumber(),
          balanceAmount: newBalanceAmount.toNumber(),
          status: newStatus,
          paidDate: newBalanceAmount.lte(0) ? new Date() : null,
        },
      });
    }

    // Update customer balances
    const newTotalPaid = decimal.add(customer.totalPaid, amount);
    const newCurrentBalance = decimal.subtract(customer.totalOutstanding, amount);

    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalPaid: newTotalPaid.toNumber(),
        currentBalance: newCurrentBalance.toNumber(),
      },
    });

    // Create reconciliation log
    await tx.reconciliationLog.create({
      data: {
        bankTransactionId,
        action: 'MANUAL_MATCHED',
        matchedCustomerId: customerId,
        matchedInvoiceId: invoiceId,
        matchedAmount: amount.toNumber(),
        reason: notes || 'Manual reconciliation',
        performedBy: userId,
      },
    });

    // Post to ledger (double-entry accounting)
    // This must be done outside the current transaction context
    // We'll return the data needed to post the ledger entry

    return {
      payment,
      customerId,
      invoiceId,
      amount: amount.toNumber(),
      paymentDate: bankTx.transactionDate,
    };
  }).then(async (result: ReconcileResult) => {
    // Post to ledger after main transaction completes
    await postPaymentReceived(
      result.payment.id,
      result.customerId,
      result.invoiceId,
      result.amount,
      userId,
      `Payment received: ${result.payment.reference}`,
      result.paymentDate
    );

    return result.payment;
  });
}

/**
 * Auto-reconcile all pending transactions
 * 
 * @param userId - User ID for audit trail
 * @returns Summary of reconciliation results
 */
export async function autoReconcileAll(userId: string) {
  const pendingTransactions = await prisma.bankTransaction.findMany({
    where: {
      status: 'PENDING',
    },
    orderBy: {
      transactionDate: 'asc',
    },
  });

  type ReconcileDetail = {
    transactionId: string;
    status: 'MATCHED' | 'UNMATCHED' | 'FAILED';
    confidence?: number;
    reason?: string;
    error?: string;
  };

  const results = {
    total: pendingTransactions.length,
    matched: 0,
    unmatched: 0,
    failed: 0,
    details: [] as ReconcileDetail[],
  };

  for (const transaction of pendingTransactions) {
    try {
      const match = await autoMatchTransaction(transaction.id);

      if (match.success && match.confidence >= 80 && match.customerId) {
        // Auto-reconcile high-confidence matches
        await reconcileTransaction(
          transaction.id,
          match.customerId,
          match.invoiceId,
          userId,
          `Auto-matched: ${match.reason} (Confidence: ${match.confidence}%)`
        );

        results.matched++;
        results.details.push({
          transactionId: transaction.bankTransactionId,
          status: 'MATCHED',
          confidence: match.confidence,
          reason: match.reason,
        });
      } else {
        // Mark as unmatched for manual review
        await prisma.bankTransaction.update({
          where: { id: transaction.id },
          data: { status: 'UNMATCHED' },
        });

        await prisma.reconciliationLog.create({
          data: {
            bankTransactionId: transaction.id,
            action: 'UNMATCHED',
            reason: match.reason || 'Could not auto-match',
            performedBy: userId,
          },
        });

        results.unmatched++;
        results.details.push({
          transactionId: transaction.bankTransactionId,
          status: 'UNMATCHED',
          confidence: match.confidence,
          reason: match.reason,
        });
      }
    } catch (error) {
      results.failed++;
      results.details.push({
        transactionId: transaction.bankTransactionId,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
