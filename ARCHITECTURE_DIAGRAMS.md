# Payment System - Architecture & Diagrams

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                          │
│                                                                 │
│  ┌──────────────────────┬────────────────────────────────────┐ │
│  │  Invoice Detail Page │                                    │ │
│  │  - Status Badge      │  Components to Build:              │ │
│  │  - Payment Form      │  1. InvoiceStatusBadge             │ │
│  │  - Payment History   │  2. PaymentForm                    │ │
│  │                      │  3. PaymentMethodSelector          │ │
│  │  ✅Ready for Build   │  4. PaymentHistoryList             │ │
│  └──────────────────────┴────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ API Calls
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│                    (/api/payments)                              │
│                                                                 │
│  POST   /api/payments           → recordPayment()              │
│  GET    /api/payments           → getPaymentMethods()          │
│  POST   /api/payments/bulk      → recordBulkPayments()         │
│  POST   /api/payments/refund    → recordRefund()               │
│  GET    /api/payments/history   → getPaymentHistory()          │
│                                                                 │
│  ✅ All endpoints ready                                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│           lib/payment-service.ts & lib/invoice-status.ts       │
│                                                                 │
│  recordPayment()          → Validate + Record + Update Status  │
│  recordBulkPayments()     → Atomic multi-payment recording     │
│  recordRefund()           → Reverse payment + status update    │
│  recordPartialPayment()   → Handle partial payments            │
│  calculateAndUpdateInvoiceStatus() → Always accurate status    │
│  getUnpaidInvoices()      → Find all unpaid invoices           │
│  getInvoiceAgingReport()  → Aging analysis                     │
│                                                                 │
│  ✅ All services implemented                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY/VALIDATION                          │
│                                                                 │
│  Input Sanitization    → lib/security.ts                       │
│  Zod Validation        → lib/validation.ts                     │
│  Error Handling        → lib/errors.ts                         │
│  XSS/Injection Prevention → Implemented                        │
│  Rate Limiting         → Implemented                           │
│                                                                 │
│  ✅ All security measures in place                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│                  (Prisma + PostgreSQL)                          │
│                                                                 │
│  Invoice Table:
│    - id, customerId, totalAmount, paidAmount
│    - balanceAmount, status, dueDate, ...
│
│  Payment Table:
│    - id, invoiceId, customerId, amount, method
│    - status, reference, date, ...
│
│  AuditLog Table:
│    - All operations logged                                     │
│                                                                 │
│  ✅ Schema ready (no migration needed)                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Payment Recording Flow

```
USER ACTION: "Record Payment"
    ↓
[Frontend] Collect data:
    - Invoice ID
    - Amount
    - Payment Method
    - Reference (optional)
    ↓
[Frontend] Validate:
    - Amount > 0 ✓
    - Amount ≤ remaining balance ✓
    - Payment method valid ✓
    ↓
[POST] /api/payments
    ↓
[Backend] parseRequestBody()
    - Convert JSON to strongly typed data
    - Catch parse errors early
    ↓
[Backend] Validate with Zod
    - invoiceId: UUID ✓
    - amount: positive number ✓
    - paymentMethod: enum ✓
    - reference: optional string ✓
    ↓
[Backend] Check permissions
    - User has 'MANAGE_PAYMENTS' ✓
    ↓
[Backend] recordPayment() function START
    ├─ Get current invoice
    ├─ Validate amount
    ├─ Start database transaction
    │  ├─ Create payment record
    │  ├─ Update invoice.paidAmount
    │  ├─ Calculate new status
    │  ├─ Create audit log entry
    │  └─ Commit transaction (all or nothing)
    ├─ Return PaymentRecordResult
    │  ├─ success: true
    │  ├─ invoiceStatus: 'PAID' or 'PARTIALLY_PAID'
    │  ├─ remainingBalance: 0 or amount
    │  └─ paymentId: new ID
    └─ recordPayment() function END
    ↓
[Frontend] Response received
    - If success: show "Payment recorded!"
    - If error: show error message
    ↓
[Frontend] Refresh invoice data
    ↓
[Frontend] Update UI
    - Status badge: "✅ PAID"
    - Payment form: hidden
    - Remaining: ₹0
    ↓
USER SEES: Invoice is now marked as PAID ✅
```

---

## 🔄 Invoice Status Lifecycle

```
DRAFT Invoice Created
    ↓
Send to Customer → Status = SENT (isNotPaid = true)
    ↓
Customer Views → Status = VIEWED (isNotPaid = true)
    ↓
                    ┌─────────────────────┐
                    ↓                     ↓
         PARTIAL PAYMENT            FULL PAYMENT
                    ↓                     ↓
         Status = PARTIALLY_PAID     Status = PAID
         isNotPaid = true            isNotPaid = false
         ← Can record more →         ← Done! ✅ →
             payments
                    ↓
             SECOND PAYMENT
         Remaining goes to ₹0
                    ↓
         Status = PAID
         isNotPaid = false
                    ↓
            ✅ PAYMENT COMPLETE
```

---

## 💾 Database Relationships

```
CUSTOMER
    │
    ├─── Invoices (1:many)
    │        │
    │        ├─ Invoice 1
    │        │    ├─ totalAmount: 10,000
    │        │    ├─ paidAmount: 5,000
    │        │    ├─ balanceAmount: 5,000
    │        │    ├─ status: 'PARTIALLY_PAID'
    │        │    ├─ isNotPaid: true
    │        │    │
    │        │    └─── Payments (1:many)
    │        │         ├─ Payment 1
    │        │         │  ├─ amount: 3,000
    │        │         │  ├─ method: 'BANK_TRANSFER'
    │        │         │  ├─ date: 2024-02-01
    │        │         │  └─ reference: 'TRF-001'
    │        │         │
    │        │         └─ Payment 2
    │        │            ├─ amount: 2,000
    │        │            ├─ method: 'MPESA'
    │        │            ├─ date: 2024-02-05
    │        │            └─ reference: 'M001234'
    │        │
    │        └─ Invoice 2
    │             ├─ totalAmount: 5,000
    │             ├─ paidAmount: 0
    │             ├─ balanceAmount: 5,000
    │             ├─ status: 'SENT'
    │             ├─ isNotPaid: true
    │             └─── Payments: (empty)
    │
    └─── AuditLogs (1:many)
         ├─ Log: "Payment recorded - 3,000"
         ├─ Log: "Invoice status updated to PARTIALLY_PAID"
         ├─ Log: "Payment recorded - 2,000"
         └─ Log: "Invoice status updated to PAID"
```

---

## 🎯 Status Determination Logic

```
calculateInvoiceStatus(totalAmount, paidAmount, dueDate)
    ↓
    ├─ If paidAmount == 0
    │  └─ return "DRAFT" or "SENT" (based on dueDate)
    │
    ├─ If 0 < paidAmount < totalAmount
    │  ├─ If past dueDate
    │  │  └─ return "OVERDUE"
    │  └─ Else
    │     └─ return "PARTIALLY_PAID"
    │
    ├─ If paidAmount >= totalAmount
    │  └─ return "PAID"
    │
    └─ Calculate isNotPaid
       └─ isNotPaid = (paidAmount < totalAmount)


DISPLAY LOGIC:
    ├─ If isNotPaid = true
    │  └─ Show "🔴 NOT PAID - ₹{balanceAmount}"
    │
    └─ If isNotPaid = false
       └─ Show "✅ PAID"
```

---

## 🔐 Security & Validation Flow

```
User Input
    ↓
[Frontend Validation]
    - Type checking
    - Range validation
    - Required field check
    ↓
[API Request] POST /api/payments
    ↓
[Backend] Rate Limit Check
    - Max 100 requests per 15 min
    - If exceeded → 429 Too Many Requests
    ↓
[Backend] Parse Request Body
    - Catch JSON parse errors
    - Convert string to types
    ↓
[Backend] Sanitize Input
    - Remove HTML/scripts
    - Check for SQL injection patterns
    - Validate email format
    - Check file uploads
    ↓
[Backend] Validate with Zod
    - Type: string/number/etc
    - Format: email, UUID, etc
    - Range: min/max values
    - Custom: business logic
    ↓
[Backend] Permission Check
    - User authenticated?
    - Has MANAGE_PAYMENTS permission?
    ↓
[Backend] Business Logic Validation
    - Invoice exists?
    - Amount valid?
    - Can record payment for this status?
    ↓
[Backend] Database Transaction
    - Atomic: all or nothing
    - Rollback on error
    ↓
[Backend] Create Audit Log
    - Record all details
    - Timestamp
    - User ID
    ↓
[Response] Success/Error
    ↓
[Frontend] Display Result
```

---

## 🎨 Component Hierarchy

```
App
    └─ Dashboard
        └─ Invoices
            └─ InvoiceDetailPage
                ├─ InvoiceStatusBadge
                │   ├─ Displays: "PAID" or "NOT PAID"
                │   ├─ Shows: Color-coded badge
                │   └─ Shows: Remaining amount
                │
                ├─ InvoiceDetailsSection
                │   ├─ Total Amount
                │   ├─ Amount Paid
                │   └─ Remaining Amount
                │
                ├─ PaymentForm (if isNotPaid)
                │   ├─ PaymentAmountInput
                │   ├─ PaymentMethodSelector
                │   │   ├─ Shows: All 15 methods
                │   │   └─ Dynamic: Fields based on method
                │   ├─ PaymentMethodFields
                │   │   ├─ For BANK_TRANSFER: bank, account
                │   │   ├─ For CHEQUE: cheque number
                │   │   └─ For MPESA: transaction ID
                │   └─ SubmitButton
                │
                ├─ SuccessMessage (after payment)
                │   └─ "Payment recorded successfully!"
                │
                ├─ ErrorMessage (on failure)
                │   └─ Shows: Error details
                │
                └─ PaymentHistorySection
                    └─ PaymentHistoryList
                        ├─ Shows: All payments
                        ├─ Each Row: Date, Method, Amount
                        └─ Action: Refund button
```

---

## 📈 Data Flow Example: Partial Payment

```
INITIAL STATE:
├─ Invoice ID: inv-123
├─ Total: ₹10,000
├─ Paid: ₹0
├─ Balance: ₹10,000
├─ Status: SENT
└─ isNotPaid: true

USER RECORDS PAYMENT #1: ₹3,000
    ↓
[recordPayment called]
    ├─ Validate: 3,000 ≤ 10,000 ✓
    ├─ Create Payment record
    │  ├─ amount: 3,000
    │  ├─ method: MPESA
    │  ├─ reference: M001234
    │  └─ status: CONFIRMED
    ├─ Update Invoice
    │  ├─ paidAmount: 0 → 3,000
    │  ├─ balanceAmount: 10,000 → 7,000
    │  ├─ calculateInvoiceStatus()
    │  └─ status: SENT → PARTIALLY_PAID
    └─ Create AuditLog
       └─ "Payment of 3,000 recorded via MPESA"
    ↓
NEW STATE:
├─ Invoice ID: inv-123
├─ Total: ₹10,000
├─ Paid: ₹3,000
├─ Balance: ₹7,000
├─ Status: PARTIALLY_PAID
├─ isNotPaid: true           ← Still NOT PAID!
└─ Payments Count: 1

[Frontend Updates]
├─ Badge: Shows "💛 NOT PAID - ₹7,000"
├─ Form: Still visible (can record more payments)
└─ History: Shows Payment 1

USER RECORDS PAYMENT #2: ₹7,000
    ↓
NEW STATE:
├─ Invoice ID: inv-123
├─ Total: ₹10,000
├─ Paid: ₹10,000
├─ Balance: ₹0
├─ Status: PAID
├─ isNotPaid: false          ← NOW FULLY PAID!
└─ Payments Count: 2

[Frontend Updates]
├─ Badge: Shows "✅ PAID"
├─ Form: Hidden
└─ History: Shows Payment 1 + Payment 2
```

---

## 🚀 Request/Response Example

### Request
```http
POST /api/payments HTTP/1.1
Host: localhost:3000
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "invoiceId": "inv-123",
  "amount": 1000,
  "paymentMethod": "BANK_TRANSFER",
  "reference": "TRF-001",
  "bankName": "XYZ Bank",
  "bankCode": "123"
}
```

### Response (Success)
```json
{
  "success": true,
  "data": {
    "paymentId": "pay-456",
    "invoiceStatus": "PAID",
    "remainingBalance": 0,
    "message": "Payment recorded successfully"
  },
  "meta": {
    "timestamp": "2024-02-23T10:30:00Z",
    "requestId": "req-789"
  }
}
```

### Response (Error)
```json
{
  "success": false,
  "error": {
    "code": "INVALID_PAYMENT_AMOUNT",
    "message": "Payment amount exceeds remaining balance"
  },
  "meta": {
    "timestamp": "2024-02-23T10:30:00Z",
    "requestId": "req-789"
  }
}
```

---

## 🧮 Payment Method Categories

```
Payment Method Groups:

MOBILE MONEY
├─ M-PESA (Instant)
├─ AIRTEL_MONEY (Instant)
├─ OTHER (Varies)

BANKING
├─ BANK_TRANSFER (1-3 days)
├─ WIRE_TRANSFER (2-5 days)
├─ BANK_CHEQUE (3-5 days)

CASH
├─ CASH (Instant)
├─ CASH_DEPOSIT (1 day)

CARDS
├─ CREDIT_CARD (Instant)
├─ DEBIT_CARD (Instant)

DIGITAL
├─ PAYPAL (1-2 days)
├─ STRIPE (1-2 days)
├─ CRYPTOCURRENCY (10-30 min)

OTHER
├─ PREPAID_VOUCHER (Instant)
├─ STORE_CREDIT (Instant)
```

---

## 📊 API Response States

```
Normal Response (200)
{
  "success": true,
  "data": {...},
  "message": "..."
}

Created Response (201)
{
  "success": true,
  "data": {...},
  "message": "Resource created"
}

Bad Request (400)
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Amount is required"
  }
}

Unauthorized (401)
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid token"
  }
}

Forbidden (403)
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Permission denied"
  }
}

Not Found (404)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Invoice not found"
  }
}

Conflict (409)
{
  "success": false,
  "error": {
    "code": "ALREADY_PAID",
    "message": "Invoice already paid"
  }
}

Rate Limited (429)
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}

Server Error (500)
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Internal server error"
  }
}
```

---

## ✅ Validation Checklist

```
Input Validation
├─ Type check
├─ Range check
├─ Format check
├─ Required field check

Sanitization
├─ Remove HTML/scripts
├─ Prevent SQL injection
├─ Prevent path traversal
├─ Check for attack patterns

Business Logic
├─ Invoice exists?
├─ Customer exists?
├─ Amount valid?
├─ Status allows payment?
├─ User has permissions?

Database Transaction
├─ All updates atomic
├─ Rollback on error
├─ Create audit logs
├─ Update timestamps

Response
├─ Status code correct
├─ Error message clear
├─ Data format valid
├─ No sensitive info leaked
```

---

## 🎯 Key Performance Indicators

```
Success Rate
├─ Target: > 99.9%
├─ Monitor: Failed transactions
└─ Alert: If < 95%

Response Time
├─ Target: < 500ms
├─ Monitor: API latency
└─ Alert: If > 1000ms

Database Performance
├─ Target: All queries < 100ms
├─ Monitor: Query times
└─ Alert: If > 500ms

Payment Methods Used
├─ Track: Usage by method
├─ Monitor: Method popularity
└─ Use: For improvements

Partial Payments
├─ Track: How many invoices partial paid
├─ Monitor: Average payment count
└─ Use: For working capital analysis
```

---

**Version:** 1.0  
**Last Updated:** February 23, 2024  
**Diagrams:** All architecture patterns documented
