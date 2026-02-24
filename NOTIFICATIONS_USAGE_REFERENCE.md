# Notifications & Alerts - Usage Reference

Quick reference for implementing notifications throughout the Kelly OS application.

## Common Patterns

### 1. Reconciliation Completion

```typescript
// app/api/reconciliation/auto-match/route.ts
import { createNotification, NotificationType } from '@/lib/notification-service';
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

async function handleReconciliationComplete(userId: string, result: any) {
  // Notify user
  await createNotification({
    userId,
    type: NotificationType.RECONCILIATION_COMPLETE,
    title: 'Reconciliation Complete',
    message: `${result.matched} of ${result.total} transactions matched`,
    severity: 'INFO',
    category: 'reconciliation',
    actionUrl: '/dashboard/reconciliation',
    metadata: {
      matched: result.matched,
      total: result.total,
      unmatched: result.unmatched,
    },
  });

  // Trigger alert if unmatched transactions exist
  if (result.unmatched > 0) {
    await triggerAlerts({
      eventType: AlertEventType.UNMATCHED_TRANSACTION,
      values: {
        status: 'UNMATCHED',
        count: result.unmatched,
      },
    });
  }
}
```

### 2. Payment Processing

```typescript
// app/api/payments/route.ts
import { createNotification, NotificationType } from '@/lib/notification-service';

async function processPayment(payment: any) {
  // Process payment...
  
  // Notify customer
  await createNotification({
    userId: payment.createdBy,
    type: NotificationType.PAYMENT_RECEIVED,
    title: `Payment of $${payment.amount} Received`,
    message: `From: ${payment.customerName}`,
    severity: 'INFO',
    relatedEntityId: payment.id,
    relatedEntityType: 'PAYMENT',
    actionUrl: `/dashboard/payments/${payment.id}`,
    metadata: {
      amount: payment.amount,
      customer: payment.customerName,
      reference: payment.reference,
    },
  });

  // Notify finance team of large payments
  if (payment.amount > 50000) {
    await triggerAlerts({
      eventType: AlertEventType.HIGH_VALUE_PAYMENT,
      relatedEntityId: payment.id,
      relatedEntityType: 'PAYMENT',
      values: {
        amount: payment.amount,
        type: 'BANK_TRANSFER',
        customer: payment.customerName,
      },
    });
  }
}
```

### 3. Invoice Management

```typescript
// app/api/invoices/route.ts
import { createBulkNotifications, NotificationType } from '@/lib/notification-service';

async function createInvoice(invoiceData: any) {
  const invoice = await prisma.invoice.create({ data: invoiceData });

  // Notify relevant users
  const financeUsers = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'FINANCE_MANAGER'] },
      isActive: true,
    },
  });

  await createBulkNotifications(
    financeUsers.map(u => u.id),
    {
      type: NotificationType.INVOICE_CREATED,
      title: `New Invoice ${invoice.invoiceNumber}`,
      message: `Invoice for ${invoice.customer.name} - $${invoice.totalAmount}`,
      severity: 'INFO',
      relatedEntityId: invoice.id,
      relatedEntityType: 'INVOICE',
      actionUrl: `/dashboard/invoices/${invoice.id}`,
    }
  );

  return invoice;
}
```

### 4. Approval Workflows

```typescript
// app/api/expenses/approvals/route.ts
import { createNotification, NotificationType } from '@/lib/notification-service';

async function requestExpenseApproval(expense: any, approverUserId: string) {
  await createNotification({
    userId: approverUserId,
    type: NotificationType.APPROVAL_REQUIRED,
    title: `Expense Approval Required: $${expense.amount}`,
    message: `${expense.category} - ${expense.description}`,
    severity: 'WARNING',
    category: 'approval',
    relatedEntityId: expense.id,
    relatedEntityType: 'EXPENSE',
    actionUrl: `/dashboard/expenses/${expense.id}/approve`,
    metadata: {
      amount: expense.amount,
      category: expense.category,
      submittedBy: expense.submittedByName,
      date: expense.date,
    },
  });
}

async function approveExpense(expense: any, approverId: string) {
  // Approve logic...

  const submitter = await prisma.user.findUnique({
    where: { id: expense.submittedBy },
  });

  await createNotification({
    userId: submitter.id,
    type: NotificationType.APPROVAL_COMPLETED,
    title: 'Expense Approved',
    message: `Your $${expense.amount} ${expense.category} expense has been approved`,
    severity: 'INFO',
    actionUrl: `/dashboard/expenses/${expense.id}`,
  });
}
```

### 5. Stock Alerts

```typescript
// lib/stock-monitoring.ts
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

async function checkStockLevels() {
  const lowStockItems = await prisma.product.findMany({
    where: {
      currentStock: {
        lte: prisma.raw('reorderLevel'),
      },
    },
  });

  for (const item of lowStockItems) {
    await triggerAlerts({
      eventType: AlertEventType.UNUSUAL_ACTIVITY, // Using as inventory alert
      relatedEntityId: item.id,
      relatedEntityType: 'PRODUCT',
      values: {
        productName: item.name,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        sku: item.sku,
      },
    });
  }
}
```

### 6. Scheduled Notifications

```typescript
// lib/scheduled-notifications.ts
import schedule from 'node-schedule';
import { createBulkNotifications, NotificationType } from '@/lib/notification-service';
import { sendDigestEmail } from '@/lib/email-service';

// Daily digest at 6 PM
schedule.scheduleJob('0 18 * * *', async () => {
  const users = await prisma.user.findMany({
    where: { isActive: true },
  });

  for (const user of users) {
    const preferences = await getNotificationPreferences(user.id);
    if (!preferences.enableDigest || preferences.digestFrequency !== 'DAILY') {
      continue;
    }

    // Get summary stats
    const summary = {
      newNotificationsCount: await getUnreadNotificationCount(user.id),
      pendingApprovalsCount: await prisma.expense.count({
        where: { status: 'PENDING' },
      }),
      failedMatchesCount: await prisma.bankTransaction.count({
        where: { matchStatus: 'FAILED' },
      }),
      alertsCount: await prisma.alertInstance.count({
        where: { status: 'ACTIVE' },
      }),
    };

    await sendDigestEmail(
      user.email,
      user.firstName,
      summary,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
    );
  }
});

// Weekly overdue invoice check
schedule.scheduleJob('0 9 * * 1', async () => {
  const overdueInvoices = await prisma.invoice.findMany({
    where: {
      status: 'PENDING',
      dueDate: { lt: new Date() },
    },
    include: { customer: true },
  });

  const financeUsers = await prisma.user.findMany({
    where: { role: 'FINANCE_MANAGER' },
  });

  await createBulkNotifications(
    financeUsers.map(u => u.id),
    {
      type: NotificationType.OVERDUE_INVOICE,
      title: `${overdueInvoices.length} Overdue Invoices`,
      message: 'Review and follow up on overdue payments',
      severity: 'WARNING',
      actionUrl: '/dashboard/invoices?status=overdue',
    }
  );
});
```

### 7. Error Handling with Notifications

```typescript
// app/api/reconciliation/upload/route.ts
import { createNotification, NotificationType } from '@/lib/notification-service';

async function handleBankStatementUpload(file: File, userId: string) {
  try {
    const result = await processStatement(file);

    await createNotification({
      userId,
      type: NotificationType.RECONCILIATION_COMPLETE,
      title: 'Bank Statement Processed',
      message: `Processed ${result.transactionCount} transactions`,
      severity: 'INFO',
      actionUrl: '/dashboard/reconciliation',
    });
  } catch (error) {
    // Notify user of error
    await createNotification({
      userId,
      type: NotificationType.EXCEPTION_ALERT,
      title: 'Statement Upload Failed',
      message: `Error: ${error.message}`,
      severity: 'ERROR',
      category: 'error',
      metadata: {
        errorCode: error.code,
        fileName: file.name,
      },
    });
  }
}
```

### 8. Multi-Step Process with Real-Time Updates

```typescript
// lib/reconciliation-service.ts
import { broadcastReconciliationStatus, broadcastMatchingProgress } from '@/lib/websocket-manager';

export async function startFullReconciliation(userId: string) {
  const reconciliationId = generateId();

  // Step 1: Start
  await broadcastReconciliationStatus(userId, {
    reconciliationId,
    status: 'in_progress',
    progress: 0,
    message: 'Starting reconciliation...',
  });

  // Step 2: Load transactions
  const transactions = await loadTransactions();

  // Step 3: Perform matching
  const result = await performMatching(transactions, (progress) => {
    // Update progress in real-time
    broadcastMatchingProgress(userId, {
      total: transactions.length,
      matched: progress.matched,
      unmatched: progress.unmatched,
      percentageComplete: (progress.matched / transactions.length) * 100,
      currentPhase: 'Matching phase',
    });
  });

  // Step 4: Complete
  await broadcastReconciliationStatus(userId, {
    reconciliationId,
    status: 'completed',
    progress: 100,
    matchedCount: result.matched,
    unmatchedCount: result.unmatched,
  });

  // Final notification
  await createNotification({
    userId,
    type: NotificationType.RECONCILIATION_COMPLETE,
    title: 'Reconciliation Complete',
    message: `${result.matched}/${transactions.length} transactions matched`,
    severity: 'INFO',
    actionUrl: `/dashboard/reconciliation/${reconciliationId}`,
  });
}
```

---

## Integration Checklist

After implementing notifications, ensure:

- [ ] Database migrations run successfully
- [ ] Environment variables configured
- [ ] Prisma schema updated and migrated
- [ ] Default alert rules created (seed)
- [ ] NotificationBell component added to header
- [ ] AlertsPanel added to dashboard
- [ ] WebSocket hook initialized in layout
- [ ] Email service tested
- [ ] Sample notifications trigger correctly
- [ ] Alert rules working as expected
- [ ] User preferences configurable
- [ ] Real-time updates working in browser

---

## Performance Tips

1. **Batch Operations**: Group multiple notifications into bulk operations
2. **Caching**: Cache frequently accessed notifications with Redis
3. **Cleanup**: Schedule automatic cleanup of old notifications
4. **Indexing**: The database schema includes optimized indexes
5. **WebSocket**: Leverage real-time updates instead of polling

---

## Security Checklist

- [ ] All endpoints require authentication
- [ ] Role-based access control implemented
- [ ] Input validation with Zod
- [ ] Rate limiting on notification creation
- [ ] Sensitive data encrypted in notifications
- [ ] XSS protection on frontend
- [ ] CSRF tokens on state-changing requests
