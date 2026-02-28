# Database Logging & Audit Trail Guide

**Status:** ✅ All critical operations are automatically logged to the database

This guide documents all the information Kelly OS ERP records to maintain a complete audit trail for compliance, security, and business analysis.

---

## 📊 Data Recording Overview

Kelly OS automatically records information across multiple tables:

1. **AuditLog** - User actions and system events
2. **SystemLog** - System-level events and performance metrics
3. **ApiMetric** - API endpoint performance tracking
4. **Business Tables** - Core business data (invoices, payments, employees, etc.)

---

## 🔐 Audit Log (AuditLog Table)

Every significant business action is logged with complete context.

### What Gets Recorded:

| Field | Description | Example |
|-------|-------------|---------|
| `userId` | User performing the action | `user_12345abc` |
| `action` | Type of action performed | `CREATE_EMPLOYEE`, `COLLECT_PAYMENT` |
| `entityType` | What was modified | `Employee`, `Invoice`, `Payment` |
| `entityId` | ID of the modified entity | `emp_67890def` |
| `description` | Human-readable description | `Created employee: John Doe` |
| `ipAddress` | Client IP address | `192.168.1.100` |
| `userAgent` | Browser/app information | `Mozilla/5.0...` |
| `metadata` | Additional context as JSON | `{"itemCount": 5, "totalAmount": 15000}` |
| `createdAt` | Timestamp | `2026-02-28T10:30:00Z` |

### Logged Actions:

#### 👥 Employee Management
- ✅ `CREATE_EMPLOYEE` - New employee added
- ✅ `UPDATE_EMPLOYEE` - Employee information modified
- ✅ `DELETE_EMPLOYEE` - Employee removed

#### 💰 Payment Processing
- ✅ `COLLECT_PAYMENT` - Payment recorded
- ✅ `RECORD_BULK_PAYMENTS` - Multiple payments recorded
- ✅ `RECORD_REFUND` - Refund processed
- ✅ `REVERSE_PAYMENT` - Payment reversed

#### 📄 Invoice Management
- ✅ `CREATE_INVOICE` - Invoice created (from sales order/POS)
- ✅ `UPDATE_INVOICE` - Invoice status changed
- ✅ `EXPORT_DATA` - Invoice exported/downloaded

#### 🛒 POS & Sales
- ✅ `CREATE_POS_ORDER` - New POS order created
- ✅ `UPDATE_POS_ORDER` - Order payment status changed

#### 🏪 Supplier & Purchase Management
- ✅ `CREATE_SUPPLIER` - New supplier added
- ✅ `CREATE_SUPPLIER_BILL` - Bill from supplier
- ✅ `SUPPLIER_BILL_SUBMIT` - Bill submitted for approval
- ✅ `SUPPLIER_BILL_APPROVE` - Bill approved
- ✅ `SUPPLIER_BILL_MATCH` - Bill matched with PO
- ✅ `RECORD_SUPPLIER_PAYMENT` - Payment to supplier

#### 📦 Inventory & Warehouse
- ✅ `CREATE_WAREHOUSE` - New warehouse
- ✅ `CREATE_WAREHOUSE_LOCATION` - Warehouse location created
- ✅ `CREATE_PRODUCT` - Product added
- ✅ `STOCK_ADJUSTMENT` - Inventory adjusted
- ✅ `STOCK_TRANSFER_CREATE` - Stock transfer initiated
- ✅ `STOCK_TRANSFER_COMPLETE` - Stock transfer completed
- ✅ `PRODUCT_RETURN_APPROVE` - Product return approved
- ✅ `PRODUCT_RETURN_PROCESS` - Product return being processed

#### 💼 HR & Payroll
- ✅ `PROCESS_PAYROLL` - Payroll processed
- ✅ `APPROVE_LEAVE` - Leave request approved
- ✅ `CREATE_EXPENSE` - Expense recorded
- ✅ `CREATE_EXPENSE_CATEGORY` - New expense category

#### 📊 Project Management
- ✅ `CREATE_PROJECT` - New project
- ✅ `CREATE_PROJECT_MILESTONE` - Project milestone

#### 🔐 System & Security
- ✅ `LOGIN` - User login
- ✅ `LOGOUT` - User logout
- ✅ `UPLOAD_STATEMENT` - Bank statement uploaded
- ✅ `RECONCILE_PAYMENT` - Payment reconciled
- ✅ `MANUAL_ADJUSTMENT` - Manual adjustment made
- ✅ `DELETE_RECORD` - Record deleted

---

## 📋 System Log (SystemLog Table)

Tracks system-level events and performance metrics.

### What Gets Recorded:

| Field | Description | Example |
|-------|-------------|---------|
| `message` | Log message | `Payment recorded successfully` |
| `level` | Severity level | `INFO`, `WARN`, `ERROR`, `CRITICAL` |
| `category` | Log category | `PAYMENT`, `INVOICE`, `AUTH`, `SECURITY` |
| `userId` | User involved (if applicable) | `user_12345abc` |
| `requestId` | Unique request tracking ID | `req_98765xyz` |
| `ipAddress` | Client IP address | `192.168.1.100` |
| `duration` | Request processing time (ms) | `145` |
| `error` | Error message if applicable | `Invoice not found: inv_123` |
| `metadata` | Additional context as JSON | `{"method": "POST", "endpoint": "/api/payments"}` |
| `createdAt` | Timestamp | `2026-02-28T10:30:00Z` |
| `expiresAt` | Auto-delete after retention period | `2026-03-31T10:30:00Z` |

### Log Levels:

- `DEBUG` - Detailed tracing info
- `INFO` - General information
- `WARN` - Warning conditions
- `ERROR` - Error conditions
- `CRITICAL` - Critical failures

### Log Categories:

- `PAYMENT` - Payment processing
- `INVOICE` - Invoice management
- `AUTH` - Authentication & authorization
- `SECURITY` - Security events
- `ACCOUNT` - Account/user events
- `VALIDATION` - Validation failures
- `RECONCILIATION` - Bank reconciliation
- `STOCK` - Inventory management
- `PAYROLL` - Payroll processing

---

## 📈 API Metrics (ApiMetric Table)

Tracks REST API performance and usage patterns.

### What Gets Recorded:

| Field | Description | Example |
|-------|-------------|---------|
| `endpoint` | API path | `/api/payments` |
| `method` | HTTP method | `POST`, `GET`, `PUT` |
| `statusCode` | Response status | `200`, `201`, `400`, `500` |
| `responseTime` | Processing time (ms) | `245` |
| `timestamp` | When request was made | `2026-02-28T10:30:00Z` |

### Tracked Endpoints:

- All `/api/hr/**` routes (employees, departments, payroll, leaves)
- All `/api/payments/**` routes
- All `/api/invoices/**` routes
- All `/api/pos/**` routes
- All `/api/suppliers/**` routes
- All `/api/products/**` routes
- All `/api/warehouses/**` routes
- All `/api/purchase-orders/**` routes
- All `/api/sales-orders/**` routes
- All `/api/credit-notes/**` routes
- All `/api/expenses/**` routes

---

## 💾 Business Data Tables

In addition to audit logs, all business data is stored with timestamps and user attribution:

### Key Tables Recording Complete Data:

| Table | Records | Timestamps | User Attribution |
|-------|---------|-----------|------------------|
| **Employee** | Complete employee info | `createdAt`, `updatedAt` | `createdBy` |
| **Invoice** | All invoices | `issueDate`, `dueDate`, `createdAt`, `updatedAt` | `createdBy` |
| **Payment** | All payments | `paymentDate`, `recordedAt`, `createdAt` | `recordedBy` |
| **PosOrder** | All POS transactions | `createdAt`, `updatedAt` | `createdBy` |
| **PurchaseOrder** | All POs | `createdAt`, `approvedAt` | `createdBy` |
| **SupplierBill** | All supplier bills | `issueDate`, `createdAt`, `approvedAt` | `createdBy`, `approvedBy` |
| **Project** | All projects | `createdAt`, `updatedAt` | `createdBy` |
| **Expense** | All expenses | `expenseDate`, `createdAt` | `createdBy` |
| **Payroll** | All payroll records | `periodStartDate`, `createdAt` | `processedBy` |
| **Leave** | All leave requests | `startDate`, `endDate`, `createdAt`, `approvedAt` | `createdBy`, `approvedBy` |

---

## 🔍 Accessing Audit Logs

### Query Examples (Prisma):

```typescript
// Get all actions by a user
const userActions = await prisma.auditLog.findMany({
  where: { userId: 'user_123' },
  orderBy: { createdAt: 'desc' },
});

// Get all payment-related actions
const paymentLogs = await prisma.auditLog.findMany({
  where: { entityType: 'Payment' },
  orderBy: { createdAt: 'desc' },
});

// Get actions on specific entity
const invoiceChanges = await prisma.auditLog.findMany({
  where: {
    entityType: 'Invoice',
    entityId: 'invoice_123',
  },
  orderBy: { createdAt: 'desc' },
});

// Get system errors
const errors = await prisma.systemLog.findMany({
  where: { level: 'ERROR' },
  orderBy: { createdAt: 'desc' },
});
```

---

## 🛡️ Data Privacy & Security

### Recorded Information Is Used For:

✅ **Compliance** - Demonstrate regulatory compliance (GDPR, CCPA, Kenya Data Protection Act)
✅ **Audit Trail** - Track all changes to financial data
✅ **Security** - Detect unauthorized access or suspicious activities
✅ **Troubleshooting** - Debug issues by reviewing what happened
✅ **Performance Analysis** - Identify slow API endpoints
✅ **Business Intelligence** - Analyze usage patterns
✅ **Forensics** - Investigate incidents post-facto

### Data Protection:

- IP addresses are recorded for security purposes
- User agents help identify compromised accounts
- Metadata is stored as JSON for flexibility
- Logs are indexed by userId, createdAt, entityType for fast queries
- System logs can be automatically expired based on retention policy

---

## 🔔 Real-Time Alerts (When Logging Detects Issues)

The system automatically logs and alerts on:

- ❌ Failed authentication attempts
- ❌ Security threat patterns in user input
- ⚠️ Validation errors
- ⚠️ API response times exceeding thresholds
- 🔍 Unusual bulk operations
- 💰 Large payment amounts
- ❌ Stock-related conflicts

---

## 📊 Log Retention Policy

| Log Type | Retention Period | Auto-Delete | Purpose |
|----------|-----------------|-------------|---------|
| AuditLog | 7 years | Manual review | Compliance & legal |
| SystemLog | 90 days | Automatic | Operational monitoring |
| ApiMetric | 30 days | Automatic | Performance analysis |

---

## ✅ Verification Checklist

To confirm all data is being recorded correctly:

- [x] AuditLog table populated with employee creation
- [x] AuditLog entries include userId, action, entityType, entityId, description
- [x] IP addresses and user agents are captured for security
- [x] All payment operations logged with amounts and methods
- [x] All invoice operations tracked
- [x] All POS orders recorded with item details
- [x] SystemLog capturing errors and warnings
- [x] ApiMetric tracking endpoint performance
- [x] Timestamps accurate for all records
- [x] User attribution present for all business data modifications

---

## 🚀 Next Steps

To review the audit trail for specific operations:

1. **Login** to Kelly OS as ADMIN or FINANCE_MANAGER
2. **Navigate** to Dashboard → Audit Trail (if available)
3. **Filter** by date range, user, action type, or entity
4. **Export** audit logs for external audits if needed

For database-level access:
```sql
-- PostgreSQL: View recent audit entries
SELECT * FROM audit_logs 
ORDER BY "createdAt" DESC 
LIMIT 100;

-- View system errors
SELECT * FROM system_logs 
WHERE level = 'ERROR' 
ORDER BY "createdAt" DESC;
```

---

**Last Updated:** February 28, 2026
**System Version:** Kelly OS v1.0
**Status:** ✅ Complete audit logging implementation
