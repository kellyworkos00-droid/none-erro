# Frontend Integration Guide - Payment System

## 🎯 5-Minute Overview

The payment system backend is **complete and ready to use**. Your job is to:

1. ✅ Display invoice status (PAID / NOT PAID / PARTIALLY_PAID)
2. ✅ Show payment form when invoice is NOT PAID
3. ✅ Accept payment via 15+ different methods
4. ✅ Show payment history
5. ✅ Optional: Enable bulk upload

---

## 🚀 Get Started in 3 Steps

### Step 1: Understand the Payment Status
```typescript
// An invoice has these fields:
interface Invoice {
  id: string;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REJECTED' | 'DISPUTED';
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  
  // Helper properties (calculated):
  isNotPaid: boolean;      // true = show "NOT PAID" and payment button
  isFullyPaid: boolean;    // true = show "PAID" and disable payments
}

// Usage:
if (invoice.isNotPaid) {
  <ShowPaymentForm />
}

if (invoice.isFullyPaid) {
  <BadgeComponent label="PAID ✅" color="green" />
}
```

### Step 2: Build Payment Form Component
```typescript
// app/components/PaymentForm.tsx

import { useState } from 'react';
import { PaymentMethod } from '@/lib/payment-methods';

export default function PaymentForm({ invoice }) {
  const [amount, setAmount] = useState(invoice.balanceAmount);
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount,
          paymentMethod: method,
          reference,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setError(result.error?.message || 'Payment failed');
        return;
      }

      // Success! Refresh invoice
      alert('Payment recorded successfully');
      window.location.reload(); // or call refetch
    } catch (err) {
      setError('Network error - please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded">
      <h2>Record Payment</h2>

      {error && <div className="error">{error}</div>}

      <div>
        <label>Amount (remaining: ₹{invoice.balanceAmount})</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          max={invoice.balanceAmount}
          required
        />
      </div>

      <div>
        <label>Payment Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="MPESA">M-Pesa</option>
          <option value="CASH">Cash</option>
          <option value="BANK_CHEQUE">Cheque</option>
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="PAYPAL">PayPal</option>
          {/* Add more methods */}
        </select>
      </div>

      <div>
        <label>Reference / Transaction ID</label>
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g., M001234 or cheque number"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Record Payment'}
      </button>
    </form>
  );
}
```

### Step 3: Add to Invoice Detail Page
```typescript
// app/dashboard/invoices/[id]/page.tsx

import PaymentForm from '@/components/PaymentForm';

export default function InvoiceDetailPage() {
  // Your existing invoice fetch logic
  const [invoice, setInvoice] = useState(null);

  if (!invoice) return <Loading />;

  return (
    <div>
      <h1>Invoice {invoice.id}</h1>

      {/* Existing invoice display */}
      <div className="invoice-details">
        <p>Total: ₹{invoice.totalAmount}</p>
        <p>Paid: ₹{invoice.paidAmount}</p>
        <p>Remaining: ₹{invoice.balanceAmount}</p>
      </div>

      {/* Show status badge */}
      <div className={`status-badge ${invoice.status.toLowerCase()}`}>
        {invoice.isNotPaid ? '🔴 NOT PAID' : '✅ PAID'}
      </div>

      {/* Show payment form only if NOT PAID */}
      {invoice.isNotPaid && <PaymentForm invoice={invoice} />}

      {/* Show paid indicator */}
      {invoice.isFullyPaid && <div className="success">This invoice has been fully paid!</div>}
    </div>
  );
}
```

---

## 📦 Payment Methods Available

Call `GET /api/payments` to get this list:

```json
{
  "success": true,
  "data": [
    {
      "value": "BANK_TRANSFER",
      "label": "Bank Transfer",
      "icon": "🏦",
      "processingTime": "1-3 days",
      "requiresReference": true
    },
    {
      "value": "MPESA",
      "label": "M-Pesa",
      "icon": "📱",
      "processingTime": "Instant",
      "requiresReference": true
    },
    {
      "value": "CASH",
      "label": "Cash",
      "icon": "💵",
      "processingTime": "Instant",
      "requiresReference": false
    },
    // ... 12 more methods
  ]
}
```

---

## 🧠 Key Concepts

### Invoice Status Field
The `status` field shows the invoice state:
- **NOT PAID**: SENT, VIEWED, PARTIALLY_PAID, OVERDUE
- **PAID**: PAID
- **FINAL**: CANCELLED, REJECTED, DISPUTED

### Display Logic
```typescript
// Show "NOT PAID" text if:
invoice.isNotPaid === true

// Show "PAID" text if:
invoice.isFullyPaid === true

// Show remaining balance if:
invoice.balanceAmount > 0

// Always use isNotPaid, never check status directly
// because calculateAndUpdateInvoiceStatus() handles it
```

### Partial Payments
Users can pay part of an invoice:
```
Invoice: ₹10,000
User pays: ₹3,000
Result: Status = PARTIALLY_PAID, Remaining = ₹7,000

Then later:
User pays: ₹7,000
Result: Status = PAID, Remaining = ₹0
```

---

## 🎨 UI/UX Best Practices

### Status Badge Colors
```css
.status-paid {
  background: #10b981;  /* Green */
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}

.status-not-paid {
  background: #ef4444;  /* Red */
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}

.status-partially-paid {
  background: #f59e0b;  /* Amber */
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
}
```

### Payment Form UX
- ✅ Pre-fill amount with remaining balance
- ✅ Allow partial payment (don't lock to full amount)
- ✅ Show remaining balance prominently
- ✅ Validate amount before submit
- ✅ Show error messages clearly
- ✅ Disable submit button while processing
- ✅ Show success message after payment

### Mobile Responsive
- ✅ Stack form fields vertically
- ✅ Make buttons full-width on mobile
- ✅ Use large touch targets (44px minimum)
- ✅ Show remaining balance at top

---

## 🔄 Complete Page Example

```typescript
// app/dashboard/invoices/[id]/page.tsx

import { useState, useEffect } from 'react';
import PaymentForm from '@/components/PaymentForm';

export default function InvoicePage({ params }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  async function fetchInvoice() {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      const result = await response.json();
      setInvoice(result.data);
    } catch (error) {
      console.error('Failed to fetch invoice');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!invoice) return <div>Invoice not found</div>;

  return (
    <div className="invoice-page">
      {/* Header */}
      <div className="header">
        <h1>Invoice {invoice.id}</h1>
        
        {/* Status Badge */}
        <div className={`status-badge ${invoice.isNotPaid ? 'not-paid' : 'paid'}`}>
          {invoice.isNotPaid ? '🔴 NOT PAID' : '✅ PAID'}
          {invoice.balanceAmount > 0 && (
            <span className="amount"> - ₹{invoice.balanceAmount} remaining</span>
          )}
        </div>
      </div>

      {/* Invoice Details */}
      <div className="details">
        <div className="row">
          <span>Amount Due:</span>
          <strong>₹{invoice.totalAmount}</strong>
        </div>
        <div className="row">
          <span>Amount Paid:</span>
          <strong>₹{invoice.paidAmount}</strong>
        </div>
        {invoice.balanceAmount > 0 && (
          <div className="row highlight">
            <span>Outstanding:</span>
            <strong>₹{invoice.balanceAmount}</strong>
          </div>
        )}
      </div>

      {/* Payment Section - Only Show if NOT PAID */}
      {invoice.isNotPaid && (
        <div className="payment-section">
          <h2>Record Payment</h2>
          <PaymentForm 
            invoice={invoice}
            onSuccess={() => {
              // Refresh invoice
              fetchInvoice();
            }}
          />
        </div>
      )}

      {/* Success Message - Show if Fully Paid */}
      {invoice.isFullyPaid && (
        <div className="success-box">
          ✅ Thank you! This invoice has been fully paid.
        </div>
      )}
    </div>
  );
}
```

---

## ⚡ React Query Implementation

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';

export function useInvoice(invoiceId) {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      return response.json();
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch invoice
      queryClient.invalidateQueries({
        queryKey: ['invoice', variables.invoiceId]
      });
    },
  });
}

// Usage:
function PaymentForm({ invoiceId }) {
  const { data: invoice } = useInvoice(invoiceId);
  const { mutate: recordPayment } = useRecordPayment();

  const handleSubmit = (data) => {
    recordPayment({
      invoiceId,
      ...data
    });
  };

  return (
    // Form JSX
  );
}
```

---

## 🧪 Testing Your Integration

### Test Case 1: Display Status
```
1. Load invoice with status = 'SENT' and paidAmount = 0
2. Should show: "🔴 NOT PAID"
3. Should show payment button
4. ✅ PASS
```

### Test Case 2: Record Payment (Full)
```
1. Load invoice with amount 10000, paidAmount 0
2. Enter 10000 in payment form
3. Click "Record Payment"
4. Should redirect/refresh
5. Status should now show: "✅ PAID"
6. Payment button should disappear
7. ✅ PASS
```

### Test Case 3: Record Payment (Partial)
```
1. Load invoice with amount 10000, paidAmount 0
2. Enter 3000 in payment form
3. Click "Record Payment"
4. Should refresh
5. Status should show: "💛 PARTIALLY_PAID - ₹7000 remaining"
6. Payment button should still show
7. ✅ PASS
```

### Test Case 4: Validation
```
1. Load invoice with 10000 total, try to enter 15000
2. Should show error: "Amount cannot exceed remaining balance"
3. Button should be disabled
4. ✅ PASS
```

---

## 📚 Available API Endpoints

### Get Payment Methods
```bash
GET /api/payments

Response:
{
  "success": true,
  "data": [
    { "value": "BANK_TRANSFER", "label": "Bank Transfer", ... },
    { "value": "MPESA", "label": "M-Pesa", ... },
    ...
  ]
}
```

### Record Payment
```bash
POST /api/payments

Body:
{
  "invoiceId": "inv-123",
  "amount": 1000,
  "paymentMethod": "BANK_TRANSFER",
  "reference": "TRF-001"
}

Response:
{
  "success": true,
  "data": {
    "invoiceStatus": "PAID",
    "remainingBalance": 0,
    "paymentId": "pay-456"
  }
}
```

### Get Payment History
```bash
GET /api/payments/history/:invoiceId

Response:
{
  "success": true,
  "data": [
    {
      "id": "pay-123",
      "amount": 5000,
      "method": "BANK_TRANSFER",
      "date": "2024-02-23",
      "reference": "TRF-001"
    },
    {
      "id": "pay-124",
      "amount": 5000,
      "method": "MPESA",
      "date": "2024-02-24",
      "reference": "M001234"
    }
  ]
}
```

---

## 🛡️ Error Handling

```typescript
async function recordPayment(data) {
  try {
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!result.success) {
      // Handle specific errors
      if (result.error?.code === 'INVALID_PAYMENT_AMOUNT') {
        setError('Amount cannot exceed remaining balance');
      } else if (result.error?.code === 'INVOICE_NOT_FOUND') {
        setError('Invoice not found');
      } else if (result.error?.code === 'ALREADY_PAID') {
        setError('This invoice is already paid');
      } else {
        setError(result.error?.message || 'Payment recording failed');
      }
      return;
    }

    // Success handling
    alert('Payment recorded successfully!');
    window.location.reload();
  } catch (error) {
    setError('Network error - please check your connection');
  }
}
```

---

## 📋 Checklist Before Deploying

- [ ] Status badge displays correctly for PAID/NOT PAID/PARTIALLY_PAID
- [ ] Payment form appears only when `isNotPaid === true`
- [ ] Payment amount validates against remaining balance
- [ ] Error messages are user-friendly
- [ ] Success message shows after payment
- [ ] Invoice refreshes after payment
- [ ] Payment button disappears after full payment
- [ ] Partial payments show remaining balance
- [ ] Form works on mobile
- [ ] Loading state shows during submission
- [ ] All payment methods load correctly

---

## 🎓 Next Steps (After Getting Started)

1. ✅ Basic payment form working
2. Add payment history display
3. Add refund capability
4. Add bulk payment upload
5. Add payment analytics
6. Add email notifications
7. Add payment reminders

---

## 💡 Tips & Tricks

**Tip 1:** Always use `invoice.isNotPaid`, never check `status === 'SENT'`
```typescript
❌ WRONG:
if (invoice.status === 'SENT') showPaymentForm();

✅ RIGHT:
if (invoice.isNotPaid) showPaymentForm();
```

**Tip 2:** Partial payments are supported - no need to enforce full payment
```typescript
✅ GOOD:
User can enter any amount from 1 to balanceAmount

❌ BAD:
Forcing payment == balanceAmount
```

**Tip 3:** Always refresh invoice after payment
```typescript
const result = await recordPayment(...);
// Don't just update local state, fetch fresh invoice
await refetchInvoice();
```

**Tip 4:** Show remaining amount prominently
```typescript
<div>Remaining: ₹{invoice.balanceAmount}</div>
```

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Payment button doesn't show | Check `invoice.isNotPaid === true` |
| Payment recording fails | Check amount ≤ balanceAmount |
| Status doesn't update | Refresh page or call refetch |
| Payment methods not loading | Check `GET /api/payments` endpoint |
| Form not submitting | Check network tab for errors |

---

**Guide Version:** 1.0  
**Last Updated:** February 23, 2024  
**Target Audience:** Frontend Developers
