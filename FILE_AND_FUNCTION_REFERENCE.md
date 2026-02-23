# Payment System - File & Function Reference

## 📁 File Structure Overview

```
lib/
  ├── payment-methods.ts          # ✅ Enums, status info, validation
  ├── payment-service.ts          # ✅ Core payment operations
  ├── invoice-status.ts           # ✅ Invoice status calculations
  ├── security.ts                 # ✅ Input sanitization
  ├── errors.ts                   # ✅ Error classes
  ├── headers.ts                  # ✅ Security headers
  ├── validation.ts               # ✅ Input validation
  ├── response.ts                 # ✅ Standard responses
  └── audit.ts                    # ✅ Audit logging

app/api/payments/
  ├── route.ts                    # ✅ Route handlers (POST, GET)
  └── handlers.ts                 # ✅ Request handlers

prisma/
  └── schema.prisma               # ✅ Database schema (already supports)
```

---

## 🔧 Core Functions by File

### `lib/payment-methods.ts` (350+ lines)

**Enums & Constants:**
```typescript
enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  MPESA = 'MPESA',
  BANK_CHEQUE = 'BANK_CHEQUE',
  CASH = 'CASH',
  CASH_DEPOSIT = 'CASH_DEPOSIT',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PAYPAL = 'PAYPAL',
  STRIPE = 'STRIPE',
  AIRTEL_MONEY = 'AIRTEL_MONEY',
  PREPAID_VOUCHER = 'PREPAID_VOUCHER',
  STORE_CREDIT = 'STORE_CREDIT',
  CRYPTOCURRENCY = 'CRYPTOCURRENCY',
  WIRE_TRANSFER = 'WIRE_TRANSFER',
  OTHER = 'OTHER',
}

enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  DISPUTED = 'DISPUTED',
}

enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  REFUNDED = 'REFUNDED',
  PROCESSING = 'PROCESSING',
}

object PAYMENT_METHOD_INFO {
  BANK_TRANSFER: { name, description, icon, color, requiresReference, processingTime },
  // ... 14 more methods
}

object INVOICE_STATUS_INFO {
  DRAFT: { label, color, icon },
  SENT: { label, color, icon },
  // ... 8 more statuses
}

object PAYMENT_STATUS_INFO {
  PENDING: { label, color },
  // ... 5 more statuses
}
```

**Functions:**
```typescript
// Calculate invoice status based on amounts
calculateInvoiceStatus(
  totalAmount: number,
  paidAmount: number,
  dueDate?: Date
): InvoiceStatus
```

**Usage:**
```typescript
const status = calculateInvoiceStatus(10000, 5000);
// Returns: 'PARTIALLY_PAID'
```

```typescript
// Validate payment amount
validatePaymentAmount(
  paymentAmount: number,
  invoiceTotal: number,
  alreadyPaid: number,
  allowOverpayment: boolean
): { valid: boolean; error?: string }
```

**Usage:**
```typescript
const result = validatePaymentAmount(1000, 5000, 2000, false);
if (result.valid) {
  // Amount is OK (1000 + 2000 = 3000, which is < 5000)
}
```

```typescript
// Check if invoice is paid
isInvoicePaid(totalAmount: number, paidAmount: number): boolean
isInvoiceNotPaid(totalAmount: number, paidAmount: number): boolean

// Check if payment can be recorded
canRecordPayment(status: InvoiceStatus): boolean

// Get payment method details
getPaymentMethodInfo(method: PaymentMethod): PaymentMethodInfo

// Group methods for display
groupPaymentMethodsByCategory(): Record<string, PaymentMethod[]>
```

---

### `lib/payment-service.ts` (400+ lines)

**Main Function - Record Payment:**
```typescript
interface RecordPaymentOptions {
  userId: string;
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod | string;
  paymentDate?: Date;
  reference?: string;
  notes?: string;
  chequeNumber?: string;
  bankCode?: string;
  bankName?: string;
  paymentGatewayId?: string;
  validateAmount?: boolean;
  allowPartialPayment?: boolean;
}

interface PaymentRecordResult {
  success: boolean;
  paymentId?: string;
  invoiceStatus?: InvoiceStatus;
  remainingBalance?: number;
  message: string;
  error?: { code: string; message: string };
}

async function recordPayment(
  options: RecordPaymentOptions
): Promise<PaymentRecordResult>
```

**Usage:**
```typescript
const result = await recordPayment({
  userId: 'user-123',
  invoiceId: 'inv-456',
  amount: 1000,
  paymentMethod: 'MPESA',
  reference: 'M001234',
});

if (result.success) {
  console.log(result.invoiceStatus);      // 'PAID' or 'PARTIALLY_PAID'
  console.log(result.remainingBalance);   // 0 or remaining
}
```

**Bulk Payments:**
```typescript
interface BulkPaymentItem {
  invoiceId: string;
  amount: number;
  reference?: string;
  notes?: string;
}

async function recordBulkPayments(options: {
  userId: string;
  payments: BulkPaymentItem[];
  paymentMethod: PaymentMethod | string;
  paymentDate?: Date;
}): Promise<PaymentRecordResult[]>
```

**Usage:**
```typescript
const results = await recordBulkPayments({
  userId: 'user-123',
  payments: [
    { invoiceId: 'inv-1', amount: 500 },
    { invoiceId: 'inv-2', amount: 750 }
  ],
  paymentMethod: 'BANK_TRANSFER'
});

// results is array of PaymentRecordResult
```

**Partial Payment:**
```typescript
async function recordPartialPayment(
  userId: string,
  invoiceId: string,
  amount: number,
  paymentMethod: PaymentMethod | string,
  reference?: string
): Promise<PaymentRecordResult>
```

**Refund:**
```typescript
async function recordRefund(
  userId: string,
  paymentId: string,
  reason?: string
): Promise<PaymentRecordResult>
```

**Payment History:**
```typescript
interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  status: string;
  date: Date;
  reference?: string;
}

async function getPaymentHistory(
  invoiceId: string,
  limit?: number
): Promise<PaymentRecord[]>
```

**Bank Transaction Matching:**
```typescript
async function recordPaymentFromBankTransaction(
  userId: string,
  invoiceId: string,
  bankTransactionId: string,
  amount?: number
): Promise<PaymentRecordResult>
```

**Customer Summary:**
```typescript
interface PaymentSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  averagePaymentDays: number;
  lastPaymentDate?: Date;
}

async function getCustomerPaymentSummary(
  customerId: string
): Promise<PaymentSummary>
```

---

### `lib/invoice-status.ts` (380+ lines)

**Calculate & Update Status:**
```typescript
async function calculateAndUpdateInvoiceStatus(
  invoiceId: string,
  options?: {
    recalculateDependents?: boolean;
  }
): Promise<{
  invoiceId: string;
  status: InvoiceStatus;
  remainingBalance: number;
  isNotPaid: boolean;
  isFullyPaid: boolean;
}>
```

**Usage:**
```typescript
const result = await calculateAndUpdateInvoiceStatus('inv-123');
console.log(result.status);        // 'PAID' or 'PARTIALLY_PAID'
console.log(result.isNotPaid);     // true/false
```

**Get Invoice with Accurate Status:**
```typescript
async function getInvoiceWithAccurateStatus(
  invoiceId: string
): Promise<Invoice & {
  isNotPaid: boolean;
  isFullyPaid: boolean;
}>
```

**Get Customer Invoices:**
```typescript
async function getCustomerInvoicesWithAccurateStatus(
  customerId: string,
  options?: {
    status?: InvoiceStatus;
    limit?: number;
  }
): Promise<Array<Invoice & {
  isNotPaid: boolean;
  isFullyPaid: boolean;
}>>
```

**Get Unpaid Invoices:**
```typescript
async function getUnpaidInvoices(
  customerId?: string,
  options?: {
    includeOverdue?: boolean;
    limit?: number;
  }
): Promise<Invoice[]>
```

**Invoice Summary:**
```typescript
interface InvoiceSummary {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalOutstanding: number;
  percentagePaid: number;
  remainingBalance: number;
  paymentCount: number;
  isOverdue: boolean;
  lastPaymentDate?: Date;
  isNotPaid: boolean;
  isFullyPaid: boolean;
}

async function getInvoiceSummary(
  invoiceId: string
): Promise<InvoiceSummary>
```

**Aging Report:**
```typescript
interface AgingBucket {
  current: number;           // Due within 30 days
  days30To60: number;        // Overdue 30-60 days
  days60To90: number;        // Overdue 60-90 days
  days90Plus: number;        // Overdue 90+ days
}

async function getInvoiceAgingReport(
  customerId?: string
): Promise<{
  buckets: AgingBucket;
  totalOverdue: number;
  invoiceCount: number;
  criticalCount: number;
}>
```

**Recalculate Customer Invoices:**
```typescript
async function recalculateCustomerInvoices(
  customerId: string
): Promise<{
  processed: number;
  updated: number;
}>
```

---

### `lib/security.ts` (360+ lines)

**Input Sanitization:**
```typescript
// Sanitize HTML content
sanitizeHtml(content: string): string

// Sanitize JSON input
sanitizeJsonInput(input: any): any

// Sanitize email
sanitizeEmail(email: string): string

// Sanitize URL
sanitizeUrl(url: string): string | null

// Sanitize CSV/Excel cell
sanitizeCellValue(value: any): any

// Check for attack patterns
checkForAttackPatterns(input: string): {
  detected: boolean;
  patterns: string[];
}

// Validate file upload
sanitizeFileUpload(file: File): {
  valid: boolean;
  error?: string;
}
```

---

### `lib/errors.ts` (450+ lines)

**Error Classes:**
```typescript
class AppError extends Error
class ValidationError extends AppError
class AuthenticationError extends AppError
class AuthorizationError extends AppError
class NotFoundError extends AppError
class ConflictError extends AppError
class RateLimitError extends AppError
class InternalError extends AppError
class ServiceUnavailableError extends AppError
class DatabaseError extends AppError
class ExternalApiError extends AppError
class BusinessLogicError extends AppError
```

**Usage:**
```typescript
if (!invoice) {
  throw new NotFoundError('Invoice not found');
}

if (payment > remaining) {
  throw new ValidationError('Payment exceeds remaining balance');
}

if (!user.canApprovePayments) {
  throw new AuthorizationError('Permission denied');
}
```

**Error Logger:**
```typescript
ErrorLogger.log(error: Error, options?: {
  context?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): void
```

---

### `lib/validation.ts` (400+ lines)

**Custom Schemas:**
```typescript
const schemas = {
  email: z.string().email(),
  password: z.string().min(8),
  strongPassword: z.string().min(12),
  phoneNumber: z.string().regex(/^\d{10}$/),
  url: z.string().url(),
  uuid: z.string().uuid(),
  amount: z.number().positive(),
  percentage: z.number().min(0).max(100),
  date: z.string().datetime(),
}
```

**Validation Functions:**
```typescript
async function parseRequestBody<T>(
  req: Request,
  schema: z.ZodSchema
): Promise<T>

async function validateQuery<T>(
  query: Record<string, any>,
  schema: z.ZodSchema
): Promise<T>

async function safeValidate<T>(
  data: any,
  schema: z.ZodSchema
): Promise<{ success: boolean; data?: T; error?: string }>

async function validateBatch<T>(
  items: any[],
  schema: z.ZodSchema
): Promise<{ valid: T[]; errors: any[] }>
```

---

### `lib/response.ts` (350+ lines)

**Response Builder:**
```typescript
class ApiResponse {
  static success<T>(data: T, message?: string)
  static created<T>(data: T, message?: string)
  static error(message: string, code?: string)
  static paginated<T>(items: T[], total: number, page: number, pageSize: number)
  static list<T>(items: T[], message?: string)
  static noContent()
  static notFound(message?: string)
}
```

**Usage:**
```typescript
return ApiResponse.success({ invoices: [...] }, 'Invoices retrieved');
// Returns: { success: true, data: {...}, message: '...', meta: {...} }

return ApiResponse.noContent();
// Returns: { success: true, data: null }

return ApiResponse.error('Payment failed', 'PAYMENT_ERROR');
// Returns: { success: false, error: { message: '...', code: '...' } }
```

---

### `app/api/payments/handlers.ts` (250+ lines)

**POST Handler (Record Payment):**
```typescript
async function handleRecordPayment(req: Request): Promise<Response>
```

**Validations:**
- invoiceId (required, UUID)
- customerId (optional, UUID)
- amount (required, positive number)
- paymentMethod (required, from PaymentMethod enum)
- paymentDate (optional, datetime)
- reference (optional, string)
- notes (optional, string)
- chequeNumber (optional for BANK_CHEQUE)
- bankCode (optional for bank transfers)
- bankName (optional for bank transfers)

**GET Handler (Get Payment Methods):**
```typescript
async function handleGetPaymentMethods(
  req: Request,
  searchParams: URLSearchParams
): Promise<Response>
```

**Parameters:**
- `grouped=true` - Returns methods grouped by category

**Other Handlers:**
```typescript
async function handleGetPaymentHistory(req: Request, invoiceId: string)
async function handleRecordBulkPayments(req: Request)
async function handleRecordRefund(req: Request)
```

---

### `app/api/payments/route.ts` (30 lines)

**Routes:**
```
POST   /api/payments              → handleRecordPayment()
GET    /api/payments              → handleGetPaymentMethods()
POST   /api/payments/bulk         → handleRecordBulkPayments()
POST   /api/payments/refund       → handleRecordRefund()
GET    /api/payments/history/:id  → handleGetPaymentHistory()
```

---

## 📊 Data Models

### Invoice (Prisma Schema)
```typescript
model Invoice {
  id                String    @id @default(cuid())
  customerId        String
  totalAmount       Float     // Total invoice amount
  paidAmount        Float     // Amount paid so far
  balanceAmount     Float     // Remaining to pay
  status            String    // DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, etc.
  dueDate           DateTime?
  issuedDate        DateTime
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  // Not in DB but calculated:
  isNotPaid         Boolean   // totalAmount > paidAmount
  isFullyPaid       Boolean   // paidAmount == totalAmount
}
```

### Payment (Prisma Schema)
```typescript
model Payment {
  id                String    @id @default(cuid())
  invoiceId         String
  customerId        String
  userId            String
  amount            Float
  method            String    // BANK_TRANSFER, MPESA, etc.
  status            String    // PENDING, CONFIRMED, FAILED, REFUNDED
  reference         String?   // TRF-001, M001234, etc.
  chequeNumber      String?
  bankCode          String?
  bankName          String?
  notes             String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

---

## 🔍 Common Query Patterns

### Get Invoice with Accurate Status
```typescript
const invoice = await getInvoiceWithAccurateStatus('inv-123');

if (invoice.isNotPaid) {
  // Show payment option
}

if (invoice.isFullyPaid) {
  // Show "PAID" badge
}
```

### Record Payment
```typescript
const result = await recordPayment({
  userId: 'user-123',
  invoiceId: 'inv-123',
  amount: 1000,
  paymentMethod: 'BANK_TRANSFER',
  reference: 'TRF-001'
});

if (result.success) {
  // Payment recorded
}
```

### Get Unpaid Invoices
```typescript
const unpaid = await getUnpaidInvoices('customer-123');

// unpaid = all invoices with isNotPaid === true
```

### Get Aging Report
```typescript
const aging = await getInvoiceAgingReport('customer-123');

console.log(aging.buckets.current);        // Due within 30 days
console.log(aging.buckets.days90Plus);     // Most overdue
```

---

## 🔐 Permissions Required

Most payment operations require one of these permissions:
```typescript
'MANAGE_PAYMENTS'        // Record, refund, modify payments
'VIEW_PAYMENTS'          // View payment history
'MANAGE_INVOICES'        // Required for invoice status updates
'ADMIN'                  // Can do anything
```

---

## 🚀 Quick Integration Map

| Task | Function | File |
|------|----------|------|
| Show invoice status | `getInvoiceWithAccurateStatus()` | `invoice-status.ts` |
| Record payment | `recordPayment()` | `payment-service.ts` |
| Get payment methods | `GET /api/payments` | `handlers.ts` |
| Show payment form | Use PaymentForm component | Frontend |
| Get unpaid invoices | `getUnpaidInvoices()` | `invoice-status.ts` |
| Record bulk payments | `recordBulkPayments()` | `payment-service.ts` |
| Record refund | `recordRefund()` | `payment-service.ts` |
| Get payment history | `getPaymentHistory()` | `payment-service.ts` |
| Get aging report | `getInvoiceAgingReport()` | `invoice-status.ts` |

---

## 📝 Type Safety

All functions are fully typed with TypeScript:

```typescript
// Frontend type import
import type { InvoiceStatus, PaymentMethod, PaymentRecordResult } from '@/lib/payment-methods';
import type { Invoice } from '@prisma/client';

// Ensure type safety
const invoice: Invoice = {...};
const status: InvoiceStatus = invoice.status;
const method: PaymentMethod = 'BANK_TRANSFER';
```

---

## 🧪 Testing Guide

### Unit Test Template
```typescript
import { recordPayment } from '@/lib/payment-service';

describe('Payment Service', () => {
  it('should record full payment', async () => {
    const result = await recordPayment({
      userId: 'test-user',
      invoiceId: 'test-invoice',
      amount: 1000,
      paymentMethod: 'BANK_TRANSFER'
    });
    
    expect(result.success).toBe(true);
    expect(result.invoiceStatus).toBe('PAID');
  });

  it('should record partial payment', async () => {
    const result = await recordPayment({
      userId: 'test-user',
      invoiceId: 'test-invoice',
      amount: 500,
      paymentMethod: 'BANK_TRANSFER'
    });
    
    expect(result.success).toBe(true);
    expect(result.invoiceStatus).toBe('PARTIALLY_PAID');
    expect(result.remainingBalance).toBe(500);
  });
});
```

---

## 📚 Related Documentation

- `PAYMENT_QUICK_REFERENCE.md` - Cheat sheet
- `PAYMENT_METHODS_GUIDE.md` - Detailed method information
- `FRONTEND_INTEGRATION_GUIDE.md` - Frontend implementation
- `INTEGRATION_CHECKLIST.md` - Complete integration tasks

---

**Reference Version:** 1.0  
**Last Updated:** February 23, 2024  
**Status:** Complete and Production-Ready
