# Real-Time Notifications & Alerts Implementation Guide

This document provides a complete guide to integrate the Real-Time Notifications & Alerts system into your Kelly OS ERP application.

## System Overview

The notification system consists of four main components:

1. **Notification Service** - Core business logic for creating and managing notifications
2. **Email Service** - Handles email notifications with customizable templates
3. **WebSocket Manager** - Real-time communication with connected clients
4. **Alert Manager** - Rule-based alert triggering system

---

## 1. Database Setup

### Run Migrations

```bash
npm run prisma:migrate -- --name add_notifications
```

This creates the following tables:
- `notifications` - User notifications
- `alert_rules` - Configurable alert rules
- `alert_instances` - Active/triggered alerts
- `notification_preferences` - User notification settings
- `notification_logs` - Log of all notifications sent

### Seed Default Alert Rules

Add this to your `prisma/seed.ts`:

```typescript
import { createDefaultAlertRules } from '@/lib/alert-manager';

async function main() {
  // ... existing seed code ...
  
  // Create default alert rules
  await createDefaultAlertRules();
}

main().catch(console.error);
```

Then run:
```bash
npm run prisma:seed
```

---

## 2. Environment Configuration

Add these variables to your `.env.local`:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@kellyos.com

# WebSocket Configuration (optional)
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For Gmail, use [App Passwords](https://support.google.com/accounts/answer/185833).

For other email providers:
- **SendGrid**: Use sendgrid API
- **AWS SES**: Use AWS credentials
- **Mailtrap** (development): No auth required

---

## 3. Frontend Integration

### Step 1: Update Header/Layout Component

Add the NotificationBell component to your header:

```typescript
// app/layout.tsx or app/components/Header.tsx
import { NotificationBell } from '@/app/components/NotificationBell';
import { currentUser } from '@/lib/auth'; // Your auth function

export default async function Header() {
  const user = await currentUser(); // Get current user ID from session
  
  return (
    <header className="flex items-center justify-between p-4">
      {/* ... other header content ... */}
      <NotificationBell userId={user?.id} />
    </header>
  );
}
```

### Step 2: Add Alerts Panel to Dashboard

```typescript
// app/dashboard/page.tsx
import { AlertsPanel } from '@/app/components/AlertsPanel';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      {/* Alerts Section */}
      <AlertsPanel maxVisible={3} />
      
      {/* ... rest of dashboard ... */}
    </div>
  );
}
```

### Step 3: Enable WebSocket in Client Context

Wrap your app with a provider to maintain WebSocket connection:

```typescript
// app/layout.tsx
'use client';

import { useEffect } from 'react';
import { useWebSocket } from '@/lib/hooks/useWebSocket';

export default function Layout({ children }: { children: React.ReactNode }) {
  // Initialize WebSocket for current user
  useWebSocket(userId); // Get userId from session
  
  return <>{children}</>;
}
```

---

## 4. Backend Integration - Triggering Notifications

### Creating Notifications Manually

```typescript
import { createNotification, NotificationType, NotificationSeverity } from '@/lib/notification-service';

// In any API route or service
await createNotification({
  userId: 'user-id',
  type: NotificationType.PAYMENT_RECEIVED,
  title: 'Payment Received',
  message: 'Payment of $5,000 received from ACME Corp',
  severity: NotificationSeverity.INFO,
  category: 'payment',
  relatedEntityId: 'payment-id',
  relatedEntityType: 'PAYMENT',
  actionUrl: '/dashboard/payments/payment-id',
  sendEmail: true,
  metadata: {
    amount: 5000,
    customer: 'ACME Corp',
  },
});
```

### Bulk Notifications

```typescript
import { createBulkNotifications } from '@/lib/notification-service';

// Send to multiple users
await createBulkNotifications(
  ['user1-id', 'user2-id', 'user3-id'],
  {
    type: NotificationType.RECONCILIATION_COMPLETE,
    title: 'Reconciliation Complete',
    message: 'Monthly reconciliation has been completed successfully',
    severity: NotificationSeverity.INFO,
  }
);
```

### Creating Alert Rules

```typescript
import { prisma } from '@/lib/prisma';

// Create a HIGH_VALUE_PAYMENT alert
await prisma.alertRule.create({
  data: {
    name: 'Alert: Large Wire Transfer',
    eventType: 'HIGH_VALUE_PAYMENT',
    description: 'Alert when a wire transfer exceeds $50,000',
    priority: 'CRITICAL',
    triggerCondition: {
      amount: { gte: 50000 },
      type: 'WIRE_TRANSFER',
    },
    enabled: true,
    notifyUsers: true,
    notifyEmail: true,
    emailRecipients: 'finance@company.com, cfo@company.com',
    cooldownMinutes: 120,
    maxAlertsPerDay: 5,
  },
});
```

### Triggering Alerts

```typescript
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

// In your reconciliation or payment processing logic
await triggerAlerts({
  eventType: AlertEventType.HIGH_VALUE_PAYMENT,
  relatedEntityId: 'payment-123',
  relatedEntityType: 'PAYMENT',
  values: {
    amount: 75000,
    type: 'WIRE_TRANSFER',
    reference: 'INV-2024-001',
  },
  userId: user.id, // Optional: alert specific user
});
```

---

## 5. Integration Examples

### Example 1: Alert on Failed Reconciliation

```typescript
// app/api/reconciliation/auto-match/route.ts
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

export async function POST(request: NextRequest) {
  try {
    // ... reconciliation logic ...
    
    const result = await performReconciliation(transactions);
    
    if (result.failedMatches.length > 0) {
      // Trigger alert
      await triggerAlerts({
        eventType: AlertEventType.FAILED_MATCH,
        values: {
          matchStatus: 'FAILED',
          failureCount: result.failedMatches.length,
          transactionIds: result.failedMatches.map(f => f.id),
        },
      });
      
      // Create notification
      const { createNotification, NotificationType } = await import('@/lib/notification-service');
      await createNotification({
        userId: user.id,
        type: NotificationType.RECONCILIATION_FAILED,
        title: 'Reconciliation Issues',
        message: `${result.failedMatches.length} transactions failed to match`,
        severity: 'WARNING',
        actionUrl: '/dashboard/reconciliation',
      });
    }
  } catch (error) {
    // Handle errors
  }
}
```

### Example 2: Payment Reminder Emails

```typescript
// lib/scheduled-jobs.ts
import schedule from 'node-schedule';
import { sendPaymentReminderEmail } from '@/lib/email-service';

// Send payment reminders daily at 9 AM
schedule.scheduleJob('0 9 * * *', async () => {
  try {
    // Get invoices due in next 7 days
    const dueSoon = await prisma.invoice.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { customer: true },
    });

    for (const invoice of dueSoon) {
      await sendPaymentReminderEmail(
        invoice.customer.email,
        invoice.invoiceNumber,
        invoice.totalAmount,
        invoice.dueDate.toISOString(),
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invoices/${invoice.id}`
      );
    }
  } catch (error) {
    console.error('Error sending payment reminders:', error);
  }
});
```

### Example 3: Approval Workflow Notifications

```typescript
// app/api/payments/approvals/route.ts
export async function POST(request: NextRequest) {
  const { paymentId, status } = await request.json();
  
  if (status === 'APPROVED') {
    // Notify finance team
    const financeUsers = await prisma.user.findMany({
      where: { role: 'FINANCE_MANAGER' },
    });

    const { createBulkNotifications, NotificationType } = await import('@/lib/notification-service');
    
    await createBulkNotifications(
      financeUsers.map(u => u.id),
      {
        type: NotificationType.APPROVAL_COMPLETED,
        title: 'Payment Approved',
        message: 'A payment has been approved and is ready for processing',
        severity: 'INFO',
        actionUrl: `/dashboard/payments/${paymentId}`,
      }
    );
  }
}
```

---

## 6. Notification Types

Available notification types in `NotificationType` enum:

```typescript
RECONCILIATION_COMPLETE     // Reconciliation finished
RECONCILIATION_FAILED       // Reconciliation encountered errors
PAYMENT_REMINDER           // Payment due soon
PAYMENT_RECEIVED           // Payment was received
APPROVAL_REQUIRED          // Action needs approval
APPROVAL_COMPLETED         // Approval finished
EXCEPTION_ALERT            // System alert
UNMATCHED_TRANSACTION      // Transaction couldn't be matched
FAILED_MATCH               // Matching failed
HIGH_VALUE_PAYMENT         // Large payment processed
OVERDUE_INVOICE            // Invoice is overdue
SYSTEM_ALERT               // System notification
INVOICE_CREATED            // New invoice created
INVOICE_UPDATED            // Invoice was modified
```

---

## 7. Alert Event Types

Available alert event types in `AlertEventType` enum:

```typescript
UNMATCHED_TRANSACTION      // Transaction remains unmatched
FAILED_MATCH               // Transaction matching failed
HIGH_VALUE_PAYMENT         // Payment exceeds threshold
OVERDUE_INVOICE            // Invoice overdue
FAILED_RECONCILIATION      // Reconciliation process failed
BLOCKED_TRANSACTION        // Transaction is blocked
DUPLICATE_DETECTED         // Duplicate transaction found
ACCOUNT_BALANCE_LOW        // Account balance below threshold
LARGE_EXPENSE              // Expense exceeds threshold
UNUSUAL_ACTIVITY           // Unusual transaction pattern detected
```

---

## 8. Testing

### Test Email Configuration

```typescript
// scripts/test-email.ts
import { verifyEmailConnection } from '@/lib/email-service';

async function test() {
  const connected = await verifyEmailConnection();
  if (connected) {
    console.log('✅ Email configuration is valid');
  } else {
    console.log('❌ Email configuration failed');
  }
}

test().catch(console.error);
```

Run with: `tsx scripts/test-email.ts`

### Send Test Notification

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "user-id",
    "type": "SYSTEM_ALERT",
    "title": "Test Notification",
    "message": "This is a test notification",
    "severity": "INFO"
  }'
```

---

## 9. User Preferences

Users can customize their notification settings:

```typescript
// GET /api/notifications/preferences
{
  "id": "pref-123",
  "userId": "user-123",
  "enablePush": true,
  "enableEmail": true,
  "enableInApp": true,
  "reconciliationAlerts": true,
  "paymentAlerts": true,
  "approvalAlerts": true,
  "exceptionAlerts": true,
  "systemAlerts": true,
  "quietHoursStart": "18:00",
  "quietHoursEnd": "08:00",
  "enableDigest": true,
  "digestFrequency": "DAILY"
}
```

---

## 10. Real-Time Features

### WebSocket Events

**Client → Server:**
- `user:join` - Join user's notification room
- `ping` - Heartbeat

**Server → Client:**
- `notification:new` - New notification
- `reconciliation:update` - Reconciliation status
- `matching:progress` - Matching progress update
- `alert:new` - New alert
- `system:notification` - System-wide notification
- `notifications:unread-count` - Unread count update

---

## 11. Performance Optimization

### Caching Strategies

```typescript
// Cache frequently accessed data
const cacheKey = `notifications:${userId}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

const notifications = await getUserNotifications(userId);
await redis.setex(cacheKey, 300, JSON.stringify(notifications)); // 5 min cache
```

### Database Indexes

Notification queries are optimized with indexes on:
- `userId` + `isRead`
- `type`
- `severity`
- `createdAt`

### Cleanup Jobs

```typescript
// Auto-delete old notifications weekly
schedule.scheduleJob('0 0 * * 0', async () => {
  await deleteOldNotifications(30); // Delete older than 30 days
});
```

---

## 12. Security Considerations

✅ **Implemented:**
- JWT authentication on all endpoints
- Role-based access control (ADMIN, FINANCE_MANAGER)
- Input validation with Zod
- XSS protection with DOMPurify (frontend)
- SQL injection prevention via Prisma ORM

⚠️ **Additional Recommendations:**
- Implement rate limiting on notification creation
- Encrypt sensitive data in notification metadata
- Use CSRF tokens for POST/PUT endpoints
- Implement notification encryption for PII

---

## 13. Troubleshooting

### Notifications not appearing

1. Check user preferences: `GET /api/notifications/preferences`
2. Verify user is connected: Check WebSocket status in browser DevTools
3. Check email service: Run `tsx scripts/test-email.ts`
4. Check database: `SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 10;`

### WebSocket connection failing

1. Check CORS configuration
2. Verify Socket.IO server is initialized
3. Check browser console for connection errors
4. Verify `NEXT_PUBLIC_APP_URL` environment variable

### Emails not sending

1. Test email configuration: `tsx scripts/test-email.ts`
2. Check email environment variables are set correctly
3. Verify inbox spam folder
4. Check `notification_logs` table for errors

---

## 14. Next Steps

1. ✅ Database migrations
2. ✅ Environment setup
3. ✅ Frontend components
4. ✅ API endpoints ready
5. ⏭️ Custom alert rules for your use cases
6. ⏭️ Scheduled notification jobs
7. ⏭️ Advanced matching with alerts
8. ⏭️ Analytics dashboard
9. ⏭️ Webhook integrations

---

For questions or issues, refer to the inline code comments in each service file.
