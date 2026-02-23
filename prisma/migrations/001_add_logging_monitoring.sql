-- Migration: Add Logging, Monitoring, and Enhanced Payment Tracking
-- Created: 2026-02-23

-- ============================================================================
-- SYSTEM LOGS TABLE - For structured logging with categories and levels
-- ============================================================================

CREATE TABLE IF NOT EXISTS "system_logs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "message" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "userId" TEXT,
  "requestId" TEXT,
  "ipAddress" TEXT,
  "duration" INTEGER,
  "error" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  
  CONSTRAINT "system_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");
CREATE INDEX "system_logs_category_idx" ON "system_logs"("category");
CREATE INDEX "system_logs_userId_idx" ON "system_logs"("userId");
CREATE INDEX "system_logs_requestId_idx" ON "system_logs"("requestId");
CREATE INDEX "system_logs_createdAt_idx" ON "system_logs"("createdAt");

-- ============================================================================
-- API METRICS TABLE - Track endpoint performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS "api_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "endpoint" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "responseTime" INTEGER NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "api_metrics_endpoint_idx" ON "api_metrics"("endpoint");
CREATE INDEX "api_metrics_method_idx" ON "api_metrics"("method");
CREATE INDEX "api_metrics_timestamp_idx" ON "api_metrics"("timestamp");

-- ============================================================================
-- QUERY METRICS TABLE - Track database query performance
-- ============================================================================

CREATE TABLE IF NOT EXISTS "query_metrics" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "query" TEXT NOT NULL,
  "duration" INTEGER NOT NULL,
  "hasError" BOOLEAN NOT NULL DEFAULT false,
  "errorMessage" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "query_metrics_duration_idx" ON "query_metrics"("duration");
CREATE INDEX "query_metrics_hasError_idx" ON "query_metrics"("hasError");
CREATE INDEX "query_metrics_timestamp_idx" ON "query_metrics"("timestamp");

-- ============================================================================
-- PAYMENT METHOD CONFIG TABLE - Store payment method metadata
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payment_method_configs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "methodName" TEXT NOT NULL UNIQUE,
  "displayName" TEXT NOT NULL,
  "icon" TEXT,
  "category" TEXT NOT NULL,
  "processingTime" INTEGER NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "requiresReference" BOOLEAN NOT NULL DEFAULT true,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- ============================================================================
-- ENHANCE PAYMENTS TABLE - Add tracking and tracing fields
-- ============================================================================

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "processingTime" INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "metadata" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failureReason" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "lastRetryAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "payments_requestId_idx" ON "payments"("requestId");
CREATE INDEX IF NOT EXISTS "payments_retryCount_idx" ON "payments"("retryCount");

-- ============================================================================
-- ENHANCE INVOICES TABLE - Add payment tracking
-- ============================================================================

ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paymentCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "partialPaymentCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_paidAmount_idx" ON "invoices"("paidAmount");

-- ============================================================================
-- ENHANCE CUSTOMERS TABLE - Add payment metrics
-- ============================================================================

ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "totalPayments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "averagePaymentAmount" FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "lastPaymentDate" TIMESTAMP(3);
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "daysOverdue" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "customers_currentBalance_idx" ON "customers"("currentBalance");
CREATE INDEX IF NOT EXISTS "customers_totalOutstanding_idx" ON "customers"("totalOutstanding");

-- ============================================================================
-- SEED DEFAULT PAYMENT METHODS
-- ============================================================================

INSERT INTO "payment_method_configs" ("id", "methodName", "displayName", "icon", "category", "processingTime", "isActive", "requiresReference", "updatedAt")
VALUES 
  ('pm_bank_transfer', 'BANK_TRANSFER', 'Bank Transfer', 'Building2', 'TRADITIONAL', 24, true, true, CURRENT_TIMESTAMP),
  ('pm_mobile_money', 'MOBILE_MONEY', 'Mobile Money', 'Smartphone', 'MOBILE', 5, true, true, CURRENT_TIMESTAMP),
  ('pm_card', 'CARD', 'Debit/Credit Card', 'CreditCard', 'DIGITAL', 5, true, true, CURRENT_TIMESTAMP),
  ('pm_digital_wallet', 'DIGITAL_WALLET', 'Digital Wallet', 'Wallet', 'DIGITAL', 10, true, true, CURRENT_TIMESTAMP),
  ('pm_crypto', 'CRYPTOCURRENCY', 'Cryptocurrency', 'Bitcoin', 'CRYPTO', 60, true, true, CURRENT_TIMESTAMP),
  ('pm_cash', 'CASH', 'Cash Payment', 'DollarSign', 'TRADITIONAL', 5, true, false, CURRENT_TIMESTAMP),
  ('pm_cheque', 'CHEQUE', 'Cheque', 'FileText', 'TRADITIONAL', 48, true, true, CURRENT_TIMESTAMP),
  ('pm_ach', 'ACH_TRANSFER', 'ACH Transfer', 'ArrowRightLeft', 'TRADITIONAL', 48, true, true, CURRENT_TIMESTAMP),
  ('pm_wire', 'WIRE_TRANSFER', 'Wire Transfer', 'GitBranch', 'TRADITIONAL', 24, true, true, CURRENT_TIMESTAMP),
  ('pm_direct_debit', 'DIRECT_DEBIT', 'Direct Debit', 'Zap', 'TRADITIONAL', 24, true, true, CURRENT_TIMESTAMP),
  ('pm_bnpl', 'BUY_NOW_PAY_LATER', 'Buy Now Pay Later', 'Calendar', 'DIGITAL', 0, true, true, CURRENT_TIMESTAMP),
  ('pm_invoice_financing', 'INVOICE_FINANCING', 'Invoice Financing', 'FileCheck', 'DIGITAL', 48, true, true, CURRENT_TIMESTAMP),
  ('pm_paypal', 'PAYPAL', 'PayPal', 'Wallet', 'DIGITAL', 5, true, true, CURRENT_TIMESTAMP),
  ('pm_stripe', 'STRIPE', 'Stripe', 'CreditCard', 'DIGITAL', 5, true, true, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS "payments_paymentMethod_idx" ON "payments"("paymentMethod");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_isReconciled_idx" ON "payments"("isReconciled");

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
-- Migration completed successfully
-- New tables: system_logs, api_metrics, query_metrics, payment_method_configs
-- Enhanced tables: payments, invoices, customers
-- Total new indexes: 15+
