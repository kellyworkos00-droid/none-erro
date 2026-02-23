# Multi-Method Payment System Guide

## Overview

The enhanced payment system allows users to record invoice payments using multiple payment methods while ensuring invoices always show accurate **"NOT PAID"** status until fully paid.

---

## 🎯 Key Features

### ✅ Multiple Payment Methods
- **15+ Payment Methods** including:
  - Bank Transfers & Wire Transfers
  - Mobile Money (M-Pesa, Airtel Money)
  - Cheques
  - Cash & Cash Deposits
  - Credit/Debit Cards
  - Digital Wallets (PayPal, Stripe)
  - Prepaid Vouchers & Store Credit
  - Cryptocurrency
  - And more...

### ✅ Flexible Payment Recording
1. **Single Payment Recording** - Record one payment at a time
2. **Bulk Payment Upload** - Record multiple payments in one transaction
3. **Bank Statement Matching** - Auto-match bank transactions to invoices
4. **Partial Payments** - Allow multiple partial payments per invoice
5. **Refund Processing** - Handle refunds and corrections

### ✅ Accurate Invoice Status
- **Automatic Status Calculation** based on payment state
- **NOT PAID** - Shows for any unpaid amount
- **PARTIALLY PAID** - Shows when partial payment received
- **PAID** - Shows only when fully paid
- **OVERDUE** - Shows when past due date with unpaid amount

---

## 📚 Libraries & Modules

### 1. **Payment Methods** (`lib/payment-methods.ts`)
Defines all available payment methods and statuses.

```typescript
import {
  PaymentMethod,
  InvoiceStatus,
  calculateInvoiceStatus,
  PAYMENT_METHOD_INFO,
  canRecordPayment,
} from '@/lib/payment-methods';

// Get payment method details
const mpesaInfo = PAYMENT_METHOD_INFO[PaymentMethod.MPESA];
console.log(mpesaInfo.name); // "M-Pesa"
console.log(mpesaInfo.processingTime); // "Instant"
```

### 2. **Payment Service** (`lib/payment-service.ts`)
Core business logic for recording payments.

```typescript
import {
  recordPayment,
  recordBulkPayments,
  recordPaymentFromBankTransaction,
  recordRefund,
  getPaymentHistory,
  getCustomerPaymentSummary,
} from '@/lib/payment-service';
```

### 3. **Invoice Status** (`lib/invoice-status.ts`)
Utilities for calculating and managing invoice status.

```typescript
import {
  getInvoiceWithAccurateStatus,
  getUnpaidInvoices,
  getInvoiceAgingReport,
  recalculateCustomerInvoices,
} from '@/lib/invoice-status';
```

---

## 🔄 Payment Recording Methods

### Method 1: Single Payment Recording

```typescript
import { recordPayment } from '@/lib/payment-service';

const result = await recordPayment({
  userId: 'user-123',
  invoiceId: 'inv-456',
  amount: 1000,
  paymentMethod: 'MPESA',
  paymentDate: new Date(),
  reference: 'TXN123456',
  notes: 'Payment from customer',
  metadata: {
    mpesaCode: 'ABC123',
  },
});

if (result.success) {
  console.log(`Invoice status: ${result.invoiceStatus}`); // PAID or PARTIALLY_PAID
  console.log(`Remaining: ${result.remainingBalance}`);
}
```

### Method 2: API Endpoint - Record Payment

**POST /api/payments**

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": "inv-456",
    "amount": 1000,
    "paymentMethod": "BANK_TRANSFER",
    "paymentDate": "2024-02-23T10:30:00Z",
    "reference": "TRF-001",
    "notes": "Payment received",
    "bankCode": "KCB",
    "bankName": "KCB Bank"
  }'
```

### Method 3: Bulk Payment Recording

```typescript
import { recordBulkPayments } from '@/lib/payment-service';

const results = await recordBulkPayments({
  userId: 'user-123',
  payments: [
    { invoiceId: 'inv-001', amount: 500 },
    { invoiceId: 'inv-002', amount: 750 },
    { invoiceId: 'inv-003', amount: 1000 },
  ],
  paymentMethod: 'BANK_TRANSFER',
  paymentDate: new Date(),
  reference: 'BULK-001',
});

// Results array with status for each payment
results.forEach(r => {
  console.log(`${r.invoiceId}: ${r.invoiceStatus}`);
});
```

### Method 4: Bank Statement Matching

```typescript
import { recordPaymentFromBankTransaction } from '@/lib/payment-service';

const result = await recordPaymentFromBankTransaction(
  'user-123',           // userId
  'inv-456',            // invoiceId
  'bank-txn-789',       // bankTransactionId
  1000                  // amount
);

// Automatically marks as RECONCILED
```

### Method 5: Partial Payment

```typescript
import { recordPartialPayment } from '@/lib/payment-service';

const result = await recordPartialPayment(
  'user-123',
  'inv-456',
  500,                    // partial amount
  'CASH',
  'First installment'
);

// Invoice status: PARTIALLY_PAID
```

### Method 6: Refund Processing

```typescript
import { recordRefund } from '@/lib/payment-service';

const result = await recordRefund(
  'user-123',
  'payment-id-789',
  'Customer requested refund due to product defect'
);

// Creates negative payment record
// Updates invoice status back to PARTIALLY_PAID or SENT
```

---

## 💳 Available Payment Methods

### Mobile Money
```typescript
PaymentMethod.MPESA           // First response time: Instant
PaymentMethod.AIRTEL_MONEY    // First response time: Instant
```

### Bank Transfers
```typescript
PaymentMethod.BANK_TRANSFER   // Processing: 1-3 business days
PaymentMethod.WIRE_TRANSFER   // Processing: 2-5 business days
```

### Cheques
```typescript
PaymentMethod.BANK_CHEQUE     // Processing: 3-5 business days
```

### Cash
```typescript
PaymentMethod.CASH            // Processing: Immediate
PaymentMethod.CASH_DEPOSIT    // Processing: 1 business day
```

### Cards
```typescript
PaymentMethod.CREDIT_CARD     // Processing: Immediate
PaymentMethod.DEBIT_CARD      // Processing: Immediate
```

### Digital
```typescript
PaymentMethod.PAYPAL          // Processing: 1-2 business days
PaymentMethod.STRIPE          // Processing: 1-2 business days
PaymentMethod.CRYPTOCURRENCY  // Processing: 10-30 minutes
```

### Other
```typescript
PaymentMethod.PREPAID_VOUCHER // Processing: Immediate
PaymentMethod.STORE_CREDIT    // Processing: Immediate
```

---

## 📊 Getting Payment Information

### Get Payment History

```typescript
import { getPaymentHistory } from '@/lib/payment-service';

const payments = await getPaymentHistory('invoice-id');

payments.forEach(p => {
  console.log(`${p.amount} via ${p.paymentMethod} on ${p.paymentDate}`);
});
```

### Get Customer Payment Summary

```typescript
import { getCustomerPaymentSummary } from '@/lib/payment-service';

const summary = await getCustomerPaymentSummary('customer-id');

console.log(`Total Invoices: ${summary.totalInvoices}`);
console.log(`Paid: ${summary.paidInvoices}`);
console.log(`Unpaid: ${summary.unpaidInvoices}`);
console.log(`Outstanding: ${summary.totalOutstanding}`);
console.log(`Avg Days to Pay: ${summary.avgPaymentDays}`);
```

### Get Invoice with Accurate Status

```typescript
import { getInvoiceWithAccurateStatus } from '@/lib/invoice-status';

const invoice = await getInvoiceWithAccurateStatus('invoice-id');

console.log(`Status: ${invoice.status}`);         // PAID, PARTIALLY_PAID, etc.
console.log(`Is Not Paid: ${invoice.isNotPaid}`); // false = fully paid
console.log(`Is Fully Paid: ${invoice.isFullyPaid}`); // true if paid
```

### Get All Unpaid Invoices

```typescript
import { getUnpaidInvoices } from '@/lib/invoice-status';

// For specific customer
const unpaid = await getUnpaidInvoices('customer-id');

// For all customers
const allUnpaid = await getUnpaidInvoices();

unpaid.forEach(inv => {
  console.log(`${inv.invoiceNumber}: ${inv.balanceAmount} remaining`);
});
```

### Get Invoice Aging Report

```typescript
import { getInvoiceAgingReport } from '@/lib/invoice-status';

const report = await getInvoiceAgingReport('customer-id');

console.log(`Current (0-30 days): ${report.current.count} invoices`);
console.log(`30-60 days overdue: ${report.thirtyDaysOverdue.count}`);
console.log(`60-90 days overdue: ${report.sixtyDaysOverdue.count}`);
console.log(`Over 90 days: ${report.over90DaysOverdue.count}`);
```

---

## 🎨 Displaying Payment Methods

### Get All Payment Methods with Details

**API:**
```bash
GET /api/payments?grouped=false
```

**Response:**
```json
[
  {
    "method": "BANK_TRANSFER",
    "name": "Bank Transfer",
    "description": "Direct bank-to-bank transfer",
    "icon": "🏦",
    "color": "blue",
    "requiresReference": true,
    "requiresVerification": true,
    "processingTime": "1-3 business days"
  },
  ...
]
```

### Get Grouped Payment Methods

**API:**
```bash
GET /api/payments?grouped=true
```

**Response:**
```json
{
  "Mobile Money": [
    { "method": "MPESA", "name": "M-Pesa", ... },
    { "method": "AIRTEL_MONEY", "name": "Airtel Money", ... }
  ],
  "Bank Transfers": [
    { "method": "BANK_TRANSFER", ... }
  ],
  ...
}
```

### Group Programmatically

```typescript
import { groupPaymentMethodsByCategory } from '@/lib/payment-methods';

const grouped = groupPaymentMethodsByCategory();

Object.entries(grouped).forEach(([category, methods]) => {
  console.log(`${category}:`);
  methods.forEach(m => {
    console.log(`  - ${m}`);
  });
});
```

---

## 🔍 Invoice Status Examples

### Example 1: Fresh Invoice (NOT PAID)
```
Invoice: INV-001
Status: SENT (NOT PAID) ❌
Total: 1,000
Paid: 0
Remaining: 1,000
```

### Example 2: Partial Payment (NOT PAID)
```
Invoice: INV-001
Status: PARTIALLY_PAID (NOT PAID) ❌
Total: 1,000
Paid: 400
Remaining: 600
```
**User can still record more payments.**

### Example 3: Fully Paid
```
Invoice: INV-001
Status: PAID ✅
Total: 1,000
Paid: 1,000
Remaining: 0
```
**No more payments can be recorded.**

### Example 4: Overdue (NOT PAID)
```
Invoice: INV-001
Status: OVERDUE (NOT PAID) ⏰
Total: 1,000
Paid: 0
Remaining: 1,000
Days Overdue: 15
```

---

## 🛡️ Validation Rules

### Payment Amount Validation

```typescript
import { validatePaymentAmount } from '@/lib/payment-methods';

const validation = validatePaymentAmount(
  500,        // payment amount
  1000,       // invoice total
  200,        // already paid
  false       // allow overpayment
);

if (!validation.valid) {
  console.log(validation.error);
  // "Payment amount exceeds remaining balance of 800. Max overpayment allowed: 800"
}
```

### Phone Number Validation

```typescript
import { sanitizePhoneNumber } from '@/lib/security';

const cleanPhone = sanitizePhoneNumber('+254 712 345 678');
// Returns: '+254712345678'
```

---

## 📋 Complete Payment Recording Flow

```typescript
import { recordPayment } from '@/lib/payment-service';
import { getInvoiceWithAccurateStatus } from '@/lib/invoice-status';
import { createAuditLog } from '@/lib/audit';

async function processInvoicePayment(
  userId: string,
  invoiceId: string,
  amount: number,
  method: string
) {
  // 1. Record payment
  const result = await recordPayment({
    userId,
    invoiceId,
    amount,
    paymentMethod: method,
    paymentDate: new Date(),
  });

  if (!result.success) {
    throw new Error(result.message);
  }

  // 2. Get updated invoice status
  const invoice = await getInvoiceWithAccurateStatus(invoiceId);

  // 3. Create audit log
  await createAuditLog({
    userId,
    action: 'RECORD_PAYMENT',
    entityType: 'Invoice',
    entityId: invoiceId,
    description: `Payment recorded: ${amount} via ${method}. Status: ${invoice.status}`,
  });

  // 4. Return summary
  return {
    paymentId: result.paymentId,
    invoiceStatus: invoice.status,
    isFullyPaid: invoice.isFullyPaid,
    remainingBalance: invoice.balanceAmount,
    message: invoice.isFullyPaid
      ? 'Invoice paid in full!'
      : `Partial payment recorded. Remaining: ${invoice.balanceAmount}`,
  };
}
```

---

## 🚀 Best Practices

### ✅ DO
- ✅ Always use `recordPayment` from service layer
- ✅ Check `isNotPaid` before allowing edits
- ✅ Create audit logs for compliance
- ✅ Validate payment amounts
- ✅ Use transactions for consistency
- ✅ Handle partial payments explicitly
- ✅ Create refund records for corrections

### ❌ DON'T
- ❌ Manually update invoice status in database
- ❌ Skip validation of payment amounts
- ❌ Record payments without audit logs
- ❌ Assume invoice is paid without checking
- ❌ Use hardcoded payment methods
- ❌ Skip error handling

---

## 📝 API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments` | POST | Record single payment |
| `/api/payments` | GET | Get available payment methods |
| `/api/payments/history/:invoiceId` | GET | Get payment history |
| `/api/payments/bulk` | POST | Record multiple payments |
| `/api/payments/refund` | POST | Record refund |

---

## 🧪 Testing Payments

### Test 1: Record Full Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "inv-123",
    "amount": 1000,
    "paymentMethod": "BANK_TRANSFER",
    "reference": "TEST-001"
  }'
# Expected: Status changes to PAID
```

### Test 2: Record Partial Payment

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "inv-123",
    "amount": 400,
    "paymentMethod": "MPESA",
    "reference": "TEST-002"
  }'
# Expected: Status changes to PARTIALLY_PAID
# Expected: Can still record more payments
```

### Test 3: Try Overpayment (should fail)

```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceId": "inv-123",
    "amount": 2000,
    "paymentMethod": "CASH",
    "reference": "TEST-003"
  }'
# Expected: Error "Payment amount exceeds remaining balance"
```

---

## ✨ Summary

The multi-method payment system provides:

✅ **15+ Payment Methods** - Choose what fits customer needs  
✅ **Accurate Status Tracking** - Always shows "NOT PAID" correctly  
✅ **Flexible Payment Recording** - Single, bulk, or automated  
✅ **Complete Audit Trail** - Full compliance tracking  
✅ **Robust Validation** - Prevents data inconsistencies  
✅ **Easy Integration** - Simple, well-documented APIs  

Users can now record payments in multiple ways while invoices always accurately reflect their payment status!
