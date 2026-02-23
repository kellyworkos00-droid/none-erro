/**
 * Type definitions for Kelly OS Bank Reconciliation Module
 */

import { 
  User, 
  Customer, 
  Invoice, 
  Payment, 
  BankTransaction,
  LedgerEntry,
  Account,
  ReconciliationLog,
  AuditLog 
} from '@prisma/client';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Extended model types with relations
export interface CustomerWithInvoices extends Customer {
  invoices: Invoice[];
}

export interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
  payments: Payment[];
}

export interface BankTransactionWithPayment extends BankTransaction {
  payments?: PaymentWithRelations[];
  reconciliationLog?: ReconciliationLog;
}

export interface PaymentWithRelations extends Payment {
  customer: Customer;
  invoice?: Invoice;
  bankTransaction?: BankTransaction;
}

export interface LedgerEntryWithAccount extends LedgerEntry {
  account: Account;
}

// Dashboard types
export interface DashboardSummary {
  totalCollectedThisMonth: number;
  outstandingBalance: number;
  pendingTransactions: number;
  unmatchedTransactions: number;
  matchedTransactions: number;
}

export interface TopCustomer {
  customer: {
    id: string;
    name: string;
    customerCode: string;
  };
  totalPaid: number;
  paymentsCount: number;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentTransactions: BankTransactionWithPayment[];
  topCustomers: TopCustomer[];
}

// Upload types
export interface UploadResult {
  uploadId: string;
  fileName: string;
  results: {
    total: number;
    imported: number;
    duplicates: number;
    failed: number;
    errors: Array<{
      transactionId: string;
      error: string;
    }>;
  };
}

// Matching types
export interface MatchResult {
  success: boolean;
  matchType: 'EXACT' | 'FUZZY' | 'PARTIAL' | 'NONE';
  confidence: number;
  customerId?: string;
  invoiceId?: string;
  matchedAmount?: number;
  reason?: string;
}

export interface AutoReconcileResults {
  total: number;
  matched: number;
  unmatched: number;
  failed: number;
  details: Array<{
    transactionId: string;
    status: string;
    confidence?: number;
    reason?: string;
    error?: string;
  }>;
}

// Filter types
export interface TransactionFilter {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CustomerFilter {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface InvoiceFilter {
  customerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}
