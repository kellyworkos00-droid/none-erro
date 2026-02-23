# Payment System Quick Reference

## 🚀 Quick Start

### Record a Payment
```typescript
import { recordPayment } from '@/lib/payment-service';

const result = await recordPayment({
  userId: 'user-id',
  invoiceId: 'invoice-id',
  amount: 1000,
  paymentMethod: 'MPESA',
  reference: 'M001234',
});

// result.invoiceStatus: 'PAID' or 'PARTIALLY_PAID'
```

### Check Invoice Status
```typescript
import { getInvoiceWithAccurateStatus } from '@/lib/invoice-status';

const invoice = await getInvoiceWithAccurateStatus('invoice-id');

if (invoice.isNotPaid) {
  console.log('Invoice has unpaid amount:', invoice.balanceAmount);
}
```

### Get All Unpaid Invoices
```typescript
import { getUnpaidInvoices } from '@/lib/invoice-status';

const unpaid = await getUnpaidInvoices('customer-id');
```

---

## 💳 Payment Methods at a Glance

| Method | Icon | Time | Reference |
|--------|------|------|-----------|
| M-Pesa | 📱 | Instant | MPESA |
| Airtel Money | 📱 | Instant | AIRTEL_MONEY |
| Bank Transfer | 🏦 | 1-3 days | BANK_TRANSFER |
| Wire Transfer | 🌍 | 2-5 days | WIRE_TRANSFER |
| Cheque | 📋 | 3-5 days | BANK_CHEQUE |
| Cash | 💵 | Instant | CASH |
| Cash Deposit | 🏪 | 1 day | CASH_DEPOSIT |
| Credit Card | 💳 | Instant | CREDIT_CARD |
| Debit Card | 💳 | Instant | DEBIT_CARD |
| PayPal | 🌐 | 1-2 days | PAYPAL |
| Stripe | 🌐 | 1-2 days | STRIPE |
| Crypto | ₿ | 10-30 min | CRYPTOCURRENCY |
| Voucher | 🎫 | Instant | PREPAID_VOUCHER |
| Store Credit | 💳 | Instant | STORE_CREDIT |

---

## 🎯 Common Operations

### Single Payment
```typescript
await recordPayment({
  userId, invoiceId, amount,
  paymentMethod: 'BANK_TRANSFER',
  reference: 'TRF-001'
});
```

### Bulk Payments
```typescript
await recordBulkPayments({
  userId,
  payments: [
    { invoiceId: 'inv-1', amount: 500 },
    { invoiceId: 'inv-2', amount: 750 }
  ],
  paymentMethod: 'BANK_TRANSFER'
});
```

### Partial Payment
```typescript
await recordPartialPayment(userId, invoiceId, 500, 'CASH');
```

### Refund
```typescript
await recordRefund(userId, paymentId, 'Customer requested refund');
```

### Bank Match
```typescript
await recordPaymentFromBankTransaction(
  userId, invoiceId, bankTransactionId, amount
);
```

---

## 📊 Status Checks

```typescript
// Check if fully paid
invoice.isFullyPaid;  // boolean

// Check if unpaid (NOT PAID)
invoice.isNotPaid;    // boolean

// Get exact status
invoice.status;  // 'PAID' | 'PARTIALLY_PAID' | 'SENT' | 'OVERDUE'

// Check remaining balance
invoice.balanceAmount;  // number

// Get payment history
await getPaymentHistory(invoiceId);

// Get customer summary
await getCustomerPaymentSummary(customerId);
```

---

## 🔄 Invoice Status Flow

```
SENT (not paid)
  ↓ partial payment
PARTIALLY_PAID (not paid)
  ↓ full payment
PAID ✅

OR

SENT (not paid)
  ↓ past due date
OVERDUE (not paid)
```

---

## 🌐 API Endpoints

### Record Payment
```bash
POST /api/payments
{
  "invoiceId": "...",
  "amount": 1000,
  "paymentMethod": "BANK_TRANSFER",
  "reference": "TRF-001"
}
```

### Get Methods
```bash
GET /api/payments
GET /api/payments?grouped=true
```

### Get History
```bash
GET /api/payments/history/:invoiceId
```

### Bulk Records
```bash
POST /api/payments/bulk
{
  "payments": [{ "invoiceId": "...", "amount": 1000 }],
  "paymentMethod": "BANK_TRANSFER"
}
```

### Record Refund
```bash
POST /api/payments/refund
{
  "paymentId": "...",
  "reason": "Customer request"
}
```

---

## 🛡️ Validation

```typescript
import { validatePaymentAmount } from '@/lib/payment-methods';

const validation = validatePaymentAmount(
  500,    // payment
  1000,   // total
  200,    // already paid
  false   // allow overpayment
);

if (!validation.valid) {
  console.error(validation.error);
}
```

---

## 🔐 Always Remember

✅ **Use service functions** - Never update invoice status manually  
✅ **Check `isNotPaid`** - Before displaying payment option  
✅ **Log payments** - For audit compliance  
✅ **Validate amounts** - Prevent overpayments  
✅ **Create transactions** - For consistency  
✅ **Handle errors** - Gracefully with proper messages  

---

## 📝 Invoice Status Labels

| Status | Label | Icon | Can Pay? |
|--------|-------|------|----------|
| DRAFT | Draft | 📝 | ❌ |
| SENT | Sent | 📧 | ✅ |
| VIEWED | Viewed | 👁️ | ✅ |
| PARTIALLY_PAID | Partial | 💛 | ✅ |
| PAID | Paid | ✅ | ❌ |
| OVERDUE | Overdue | ⏰ | ✅ |
| CANCELLED | Cancelled | ❌ | ❌ |

---

## 🔍 Display Logic

```typescript
// Show "NOT PAID" for:
// - SENT
// - VIEWED
// - PARTIALLY_PAID
// - OVERDUE

// Show "PAID" for:
// - PAID

// Don't allow payments for:
// - PAID
// - CANCELLED
// - REJECTED
// - DISPUTED
```

---

## 🎨 UI Patterns

### Show Payment Option
```typescript
if (invoice.isNotPaid && canRecordPayment(invoice.status)) {
  <PaymentButton invoice={invoice} />
}
```

### Show Status Badge
```typescript
<StatusBadge status={invoice.status} />
```

### Show Unpaid Indicator
```typescript
if (invoice.isNotPaid) {
  <UnpaidIndicator
    amount={invoice.balanceAmount}
    dueDate={invoice.dueDate}
  />
}
```

---

## ⚡ Performance Tips

✅ Use batch operations for multiple payments  
✅ Cache `getInvoiceWithAccurateStatus` results  
✅ Use pagination for payment history  
✅ Index on `invoiceId` and `customerId`  
✅ Don't N+1 query payments  

---

## 🧪 Test Cases

```typescript
// Test 1: Full payment
recordPayment({ amount: 1000, total: 1000 });
// Result: PAID ✅

// Test 2: Partial payment
recordPayment({ amount: 400, total: 1000 });
// Result: PARTIALLY_PAID + remaining: 600

// Test 3: Overpayment (should fail)
recordPayment({ amount: 1500, total: 1000 });
// Result: Error

// Test 4: Second partial
recordPayment({ amount: 600, total: 1000 });
// Result: PAID ✅

// Test 5: Refund
recordRefund(paymentId, reason);
// Result: Back to PARTIALLY_PAID
```

---

## 🚨 Error Handling

```typescript
const result = await recordPayment({...});

if (!result.success) {
  switch (result.error) {
    case 'INVOICE_NOT_FOUND':
      // Show invoice not found error
      break;
    case 'ALREADY_PAID':
      // Show invoice already paid
      break;
    case 'INVALID_PAYMENT_AMOUNT':
      // Show amount validation error
      break;
    case 'INTERNAL_ERROR':
      // Show generic error
      break;
  }
}
```

---

## 📚 Key Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `recordPayment()` | Record single | Result |
| `recordBulkPayments()` | Record multiple | Result[] |
| `recordPartialPayment()` | Partial payment | Result |
| `recordRefund()` | Process refund | Result |
| `recordPaymentFromBankTransaction()` | Auto-match | Result |
| `getInvoiceWithAccurateStatus()` | Get status | Invoice |
| `getUnpaidInvoices()` | Unpaid list | Invoice[] |
| `getPaymentHistory()` | Payment history | Payment[] |
| `getCustomerPaymentSummary()` | Customer stats | Summary |
| `getInvoiceAgingReport()` | Aging report | Report |

---

## 🎯 Invoice Status at a Glance

**NOT PAID**: SENT, VIEWED, PARTIALLY_PAID, OVERDUE  
**PAID**: PAID  
**FINAL**: CANCELLED, REJECTED, DISPUTED  

---

**Last Updated:** February 23, 2024  
**Quick Reference Version:** 1.0
