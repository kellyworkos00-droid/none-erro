# Real-Time Notifications & Alerts - Quick Reference Card

## 🚀 One-Liner Setup

```bash
# Install → Migrate → Seed
npm install && npm run prisma:generate && npm run prisma:migrate && npm run prisma:seed
```

---

## 📦 Core Imports

```typescript
// Notifications
import { createNotification, NotificationType, NotificationSeverity } from '@/lib/notification-service';
import { createBulkNotifications, markNotificationAsRead } from '@/lib/notification-service';

// Alerts
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

// Email
import { sendEmail, sendPaymentReminderEmail, sendApprovalRequiredEmail } from '@/lib/email-service';

// WebSocket
import { broadcastNotification, broadcastAlert, broadcastReconciliationStatus } from '@/lib/websocket-manager';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
```

---

## 🔔 Quick Code Snippets

### Create Single Notification
```typescript
await createNotification({
  userId: 'user-123',
  type: NotificationType.PAYMENT_RECEIVED,
  title: 'Payment Received',
  message: 'Payment of $5,000 received',
  severity: 'INFO',
  actionUrl: '/dashboard/payments/123',
  sendEmail: true,
});
```

### Create Bulk Notification
```typescript
await createBulkNotifications(
  ['user1', 'user2', 'user3'],
  {
    type: NotificationType.RECONCILIATION_COMPLETE,
    title: 'Reconciliation Complete',
    message: 'Monthly reconciliation finished',
    severity: 'INFO',
  }
);
```

### Trigger Alert
```typescript
await triggerAlerts({
  eventType: AlertEventType.HIGH_VALUE_PAYMENT,
  values: {
    amount: 75000,
    customer: 'ACME Corp',
  },
});
```

### Send Email
```typescript
await sendPaymentReminderEmail(
  'customer@company.com',
  'INV-001',
  5000,
  '2026-03-01',
  'https://app.com/invoices/inv-001'
);
```

### Use WebSocket Hook
```typescript
const { isConnected, sendMessage } = useWebSocket(userId);

// Send custom message
sendMessage('custom:event', { data: 'value' });
```

---

## 📊 Notification Types

| Type | Use Case |
|------|----------|
| `RECONCILIATION_COMPLETE` | After successful reconciliation |
| `PAYMENT_RECEIVED` | When payment is received |
| `APPROVAL_REQUIRED` | When action needs approval |
| `APPROVAL_COMPLETED` | When approval is done |
| `EXCEPTION_ALERT` | For system errors/warnings |
| `INVOICE_CREATED` | When new invoice created |
| `OVERDUE_INVOICE` | For past-due invoices |
| `SYSTEM_ALERT` | General system notifications |

## 🚨 Alert Event Types

| Type | Threshold |
|------|-----------|
| `HIGH_VALUE_PAYMENT` | Amount > $50,000 |
| `OVERDUE_INVOICE` | Days past due > 30 |
| `UNMATCHED_TRANSACTION` | Transaction unmatched |
| `FAILED_MATCH` | Matching failed |
| `FAILED_RECONCILIATION` | Reconciliation error |
| `BLOCKED_TRANSACTION` | Transaction blocked |
| `DUPLICATE_DETECTED` | Duplicate found |
| `UNUSUAL_ACTIVITY` | Pattern detected |

---

## ⚙️ Key Configuration

```env
# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=app-password
EMAIL_FROM=noreply@kellyos.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🎨 Frontend Components

```typescript
// Add to Header
import { NotificationBell } from '@/app/components/NotificationBell';
<NotificationBell userId={userID} />

// Add to Dashboard
import { AlertsPanel } from '@/app/components/AlertsPanel';
<AlertsPanel maxVisible={3} />

// Add to Layout
import { useWebSocket } from '@/lib/hooks/useWebSocket';
useWebSocket(userId);
```

---

## 📋 API Endpoints Cheat Sheet

```bash
# Get notifications
GET /api/notifications?skip=0&take=20

# Create notification (admin)
POST /api/notifications
Body: { userId, type, title, message, severity }

# Mark as read
PATCH /api/notifications
Body: { action: "read", notificationIds: [...] }

# Get preferences
GET /api/notifications/preferences

# Update preferences
PUT /api/notifications/preferences
Body: { enableEmail: true, ... }

# Get alerts
GET /api/alerts?skip=0&take=50

# Acknowledge alert
PATCH /api/alerts
Body: { action: "acknowledge", alertIds: [...] }

# Get unread count
GET /api/notifications/unread
```

---

## 🔄 Alert Rule Creation

```typescript
await prisma.alertRule.create({
  data: {
    name: 'High Value Alert',
    eventType: 'HIGH_VALUE_PAYMENT',
    description: 'Alert for payments over $50k',
    priority: 'CRITICAL',
    triggerCondition: {
      amount: { gte: 50000 },
    },
    enabled: true,
    notifyUsers: true,
    notifyEmail: true,
    emailRecipients: 'finance@company.com',
  },
});
```

---

## 🧪 Testing Commands

```bash
# Test email
tsx scripts/test-email.ts

# Open Prisma Studio
npm run prisma:studio

# Create test notification via API
curl -X POST http://localhost:3000/api/notifications \
  -H "Authorization: Bearer TOKEN" \
  -d '{"userId":"123","type":"SYSTEM_ALERT","title":"Test","message":"Test"}'
```

---

## 📞 Notification Methods

| Method | Usage | Speed | Reliability |
|--------|-------|-------|-------------|
| **In-App** | Real-time in browser | Instant | Requires online |
| **Email** | Persistent message | 1-5 min | Reliable (email) |
| **WebSocket** | Live updates | Real-time | Requires connection |
| **Webhook** | External systems | Async | Configurable retry |

---

## ✅ Integration Checklist

Basic Setup
- [ ] Database migration complete
- [ ] Prisma client generated
- [ ] Default alert rules seeded
- [ ] Email configured and tested

Frontend
- [ ] NotificationBell added to header
- [ ] AlertsPanel added to dashboard
- [ ] useWebSocket hook initialized

Backend
- [ ] Notifications in payment workflow
- [ ] Notifications in reconciliation
- [ ] Alerts configured for your use cases

Testing
- [ ] Manual notifications work
- [ ] Emails send correctly
- [ ] WebSocket connection active
- [ ] Alerts trigger properly

---

## 🎯 Common Patterns

**On User Action:**
```typescript
await createNotification({ userId, type, title, message, actionUrl });
```

**On System Event:**
```typescript
await triggerAlerts({ eventType, values });
```

**To Multiple Users:**
```typescript
await createBulkNotifications([userIds], { type, title, message });
```

**With Email:**
```typescript
await createNotification({ ..., sendEmail: true });
```

**With Real-Time Update:**
```typescript
await broadcastNotification(userId, notification);
```

---

## 🚨 Severity Levels

| Level | Color | Icon | Usage |
|-------|-------|------|-------|
| `INFO` | Blue | ℹ️ | Informational |
| `WARNING` | Yellow | ⚠️ | Action needed |
| `ERROR` | Orange | ⚠️ | Something failed |
| `CRITICAL` | Red | ❌ | Urgent action |

---

## 🔐 Security Notes

✅ All endpoints require authentication  
✅ Role-based access control enforced  
✅ Input validated with Zod  
✅ Email templates escaped  
✅ WebSocket user verification  

---

## 📈 Performance Tips

1. Use bulk notifications when possible
2. Add indexes on frequently queried fields (already done)
3. Cache notification preferences with Redis
4. Clean up old notifications weekly
5. Monitor notification_logs table

---

## 🔗 Documentation Links

- **Full Guide**: See `NOTIFICATIONS_INTEGRATION_GUIDE.md`
- **Code Examples**: See `NOTIFICATIONS_USAGE_REFERENCE.md`
- **Setup Steps**: See `NOTIFICATIONS_QUICK_START.md`
- **Implementation Details**: See `NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md`

---

## ❓ Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Notifications not showing | Check preferences & WebSocket connection |
| Emails not sending | Test with `tsx scripts/test-email.ts` |
| Migration fails | Run `npx prisma migrate resolve --rolled_back` |
| WebSocket won't connect | Check `NEXT_PUBLIC_APP_URL` & browser console |

---

**Last Updated**: February 24, 2026  
**Version**: 1.0  
**Status**: ✅ Production Ready
