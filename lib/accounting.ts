/**
 * Double-Entry Accounting System for Kelly OS
 * 
 * Implements production-grade accounting rules:
 * - Every transaction has equal debits and credits
 * - Ledger entries are immutable
 * - All changes are tracked
 * - Reversals are used instead of deletions
 */

import prisma from './prisma';
import type { TransactionClient } from './types';
// Enum types for compatibility
type LedgerEntryType = 'DEBIT' | 'CREDIT';

import { generateTransactionId } from './utils';
import Decimal from 'decimal.js';

/**
 * Standard account codes for the system
 */
export const ACCOUNT_CODES = {
  DTB_BANK: '1010',           // DTB Bank Account (Asset)
  ACCOUNTS_RECEIVABLE: '1200', // Accounts Receivable (Asset)
  CASH_CLEARING: '1300',       // Cash Clearing (Asset) - for unmatched
  SALES_REVENUE: '4000',       // Sales Revenue (Revenue)
  SERVICE_REVENUE: '4100',     // Service Revenue (Revenue)
  OWNERS_EQUITY: '3000',       // Owner's Equity (Equity)
} as const;

interface LedgerEntryInput {
  accountCode: string;
  entryType: LedgerEntryType;
  amount: number | string | Decimal;
  description: string;
  customerId?: string;
  invoiceId?: string;
  paymentId?: string;
  userId: string;
  entryDate?: Date;
}

/**
 * Post a double-entry transaction to the ledger
 * This is the core of the accounting system - ensures debits = credits
 * 
 * @param entries - Array of ledger entries (must balance)
 * @returns Array of created ledger entries
 * @throws Error if entries don't balance
 */
export async function postLedgerTransaction(entries: LedgerEntryInput[]) {
  if (entries.length < 2) {
    throw new Error('Double-entry requires at least 2 entries (debit and credit)');
  }

  // Calculate totals
  let debitTotal = new Decimal(0);
  let creditTotal = new Decimal(0);

  for (const entry of entries) {
    const amount = new Decimal(entry.amount);
    if (entry.entryType === 'DEBIT') {
      debitTotal = debitTotal.add(amount);
    } else {
      creditTotal = creditTotal.add(amount);
    }
  }

  // Verify balance (critical for data integrity)
  if (!debitTotal.equals(creditTotal)) {
    throw new Error(
      `Transaction must balance: Debits (${debitTotal}) ≠ Credits (${creditTotal})`
    );
  }

  // Generate unique transaction ID for grouping
  const transactionId = generateTransactionId('LEDGER');
  const entryDate = entries[0].entryDate || new Date();

  // Create all ledger entries in a transaction
  const createdEntries = await prisma.$transaction(async (tx: TransactionClient) => {
    const results = [];

    for (const entry of entries) {
      // Get account
      const account = await tx.account.findUnique({
        where: { accountCode: entry.accountCode },
      });

      if (!account) {
        throw new Error(`Account not found: ${entry.accountCode}`);
      }

      // Create ledger entry (immutable)
      const ledgerEntry = await tx.ledgerEntry.create({
        data: {
          accountId: account.id,
          transactionId,
          entryType: entry.entryType,
          amount: new Decimal(entry.amount).toNumber(),
          entryDate,
          description: entry.description,
          customerId: entry.customerId,
          invoiceId: entry.invoiceId,
          paymentId: entry.paymentId,
          createdBy: entry.userId,
        },
      });

      // Update account balance
      const amountDecimal = new Decimal(entry.amount);
      let balanceChange = amountDecimal;

      // Determine balance impact based on account type and entry type
      if (
        (account.accountType === 'ASSET' && entry.entryType === 'DEBIT') ||
        (account.accountType === 'EXPENSE' && entry.entryType === 'DEBIT')
      ) {
        // Increase balance
        balanceChange = amountDecimal;
      } else if (
        (account.accountType === 'ASSET' && entry.entryType === 'CREDIT') ||
        (account.accountType === 'EXPENSE' && entry.entryType === 'CREDIT')
      ) {
        // Decrease balance
        balanceChange = amountDecimal.neg();
      } else if (
        (account.accountType === 'LIABILITY' && entry.entryType === 'CREDIT') ||
        (account.accountType === 'EQUITY' && entry.entryType === 'CREDIT') ||
        (account.accountType === 'REVENUE' && entry.entryType === 'CREDIT')
      ) {
        // Increase balance
        balanceChange = amountDecimal;
      } else {
        // Decrease balance
        balanceChange = amountDecimal.neg();
      }

      await tx.account.update({
        where: { id: account.id },
        data: {
          currentBalance: {
            increment: balanceChange.toNumber(),
          },
        },
      });

      results.push(ledgerEntry);
    }

    return results;
  });

  return createdEntries;
}

/**
 * Post payment received from customer
 * 
 * Accounting entry:
 * DR: Bank Account (Asset increases)
 * CR: Accounts Receivable (Asset decreases)
 * 
 * @param paymentId - Payment record ID
 * @param customerId - Customer ID
 * @param invoiceId - Invoice ID (optional)
 * @param amount - Payment amount
 * @param userId - User performing the action
 * @param description - Payment description
 */
export async function postPaymentReceived(
  paymentId: string,
  customerId: string,
  invoiceId: string | undefined,
  amount: number | Decimal,
  userId: string,
  description: string,
  paymentDate: Date
) {
  const entries: LedgerEntryInput[] = [
    {
      accountCode: ACCOUNT_CODES.DTB_BANK,
      entryType: 'DEBIT',
      amount,
      description,
      customerId,
      invoiceId,
      paymentId,
      userId,
      entryDate: paymentDate,
    },
    {
      accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      entryType: 'CREDIT',
      amount,
      description,
      customerId,
      invoiceId,
      paymentId,
      userId,
      entryDate: paymentDate,
    },
  ];

  return await postLedgerTransaction(entries);
}

/**
 * Post invoice creation
 * 
 * Accounting entry:
 * DR: Accounts Receivable (Asset increases)
 * CR: Revenue (Revenue increases)
 * 
 * @param invoiceId - Invoice record ID
 * @param customerId - Customer ID
 * @param amount - Invoice amount
 * @param userId - User creating the invoice
 * @param description - Invoice description
 */
export async function postInvoiceCreated(
  invoiceId: string,
  customerId: string,
  amount: number | Decimal,
  userId: string,
  description: string,
  invoiceDate: Date
) {
  const entries: LedgerEntryInput[] = [
    {
      accountCode: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      entryType: 'DEBIT',
      amount,
      description,
      customerId,
      invoiceId,
      userId,
      entryDate: invoiceDate,
    },
    {
      accountCode: ACCOUNT_CODES.SALES_REVENUE,
      entryType: 'CREDIT',
      amount,
      description,
      customerId,
      invoiceId,
      userId,
      entryDate: invoiceDate,
    },
  ];

  return await postLedgerTransaction(entries);
}

/**
 * Reverse a ledger transaction
 * Creates offsetting entries instead of deleting
 * 
 * @param transactionId - Original transaction ID to reverse
 * @param userId - User performing the reversal
 * @param reason - Reason for reversal
 */
export async function reverseLedgerTransaction(
  transactionId: string,
  userId: string,
  reason: string
) {
  // Get original entries
  const originalEntries = await prisma.ledgerEntry.findMany({
    where: { transactionId },
    include: { account: true },
  });

  if (originalEntries.length === 0) {
    throw new Error('Transaction not found');
  }

  if (originalEntries.some((entry) => entry.isReversed)) {
    throw new Error('Transaction has already been reversed');
  }

  // Create reversal entries (opposite type)
  const reversalTransactionId = generateTransactionId('REVERSAL');

  await prisma.$transaction(async (tx: TransactionClient) => {
    for (const original of originalEntries) {
      // Create opposite entry
      const reversalEntry = await tx.ledgerEntry.create({
        data: {
          accountId: original.accountId,
          transactionId: reversalTransactionId,
          entryType: original.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          amount: original.amount,
          entryDate: new Date(),
          description: `REVERSAL: ${reason}`,
          customerId: original.customerId,
          invoiceId: original.invoiceId,
          paymentId: original.paymentId,
          createdBy: userId,
        },
      });

      // Mark original as reversed
      await tx.ledgerEntry.update({
        where: { id: original.id },
        data: {
          isReversed: true,
          reversalEntryId: reversalEntry.id,
        },
      });

      // Update account balance
      const amountDecimal = new Decimal(original.amount);
      let balanceChange = amountDecimal;

      if (
        (original.account.accountType === 'ASSET' && original.entryType === 'DEBIT') ||
        (original.account.accountType === 'EXPENSE' && original.entryType === 'DEBIT')
      ) {
        balanceChange = amountDecimal.neg(); // Reverse the increase
      } else if (
        (original.account.accountType === 'ASSET' && original.entryType === 'CREDIT') ||
        (original.account.accountType === 'EXPENSE' && original.entryType === 'CREDIT')
      ) {
        balanceChange = amountDecimal; // Reverse the decrease
      } else if (
        (original.account.accountType === 'LIABILITY' && original.entryType === 'CREDIT') ||
        (original.account.accountType === 'EQUITY' && original.entryType === 'CREDIT') ||
        (original.account.accountType === 'REVENUE' && original.entryType === 'CREDIT')
      ) {
        balanceChange = amountDecimal.neg(); // Reverse the increase
      } else {
        balanceChange = amountDecimal; // Reverse the decrease
      }

      await tx.account.update({
        where: { id: original.accountId },
        data: {
          currentBalance: {
            increment: balanceChange.toNumber(),
          },
        },
      });
    }
  });

  return reversalTransactionId;
}

/**
 * Get account balance
 * @param accountCode - Account code
 * @returns Current balance
 */
export async function getAccountBalance(accountCode: string): Promise<Decimal> {
  const account = await prisma.account.findUnique({
    where: { accountCode },
    select: { currentBalance: true },
  });

  if (!account) {
    throw new Error(`Account not found: ${accountCode}`);
  }

  return new Decimal(account.currentBalance);
}

/**
 * Verify ledger integrity
 * Ensures all transactions balance
 * @returns Array of transactions that don't balance
 */
export async function verifyLedgerIntegrity(): Promise<string[]> {
  const transactions = await prisma.ledgerEntry.groupBy({
    by: ['transactionId'],
    _sum: {
      amount: true,
    },
    where: {
      isReversed: false,
    },
  });

  const unbalanced = [];

  for (const tx of transactions) {
    // Get individual entries
    const entries = await prisma.ledgerEntry.findMany({
      where: {
        transactionId: tx.transactionId,
        isReversed: false,
      },
    });

    let debitTotal = new Decimal(0);
    let creditTotal = new Decimal(0);

    for (const entry of entries) {
      if (entry.entryType === 'DEBIT') {
        debitTotal = debitTotal.add(new Decimal(entry.amount));
      } else {
        creditTotal = creditTotal.add(new Decimal(entry.amount));
      }
    }

    if (!debitTotal.equals(creditTotal)) {
      unbalanced.push(tx.transactionId);
    }
  }

  return unbalanced;
}
