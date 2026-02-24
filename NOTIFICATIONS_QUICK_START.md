# Real-Time Notifications & Alerts - Quick Start Checklist

Follow this checklist to integrate and activate the notification system in your Kelly OS ERP.

## 📋 Pre-Installation Checklist

- [ ] Review the implementation summary: `NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md`
- [ ] Review the integration guide: `NOTIFICATIONS_INTEGRATION_GUIDE.md`
- [ ] Configure email provider (Gmail, SendGrid, Mailtrap, etc.)
- [ ] Have Docker/database admin access ready if needed

---

## 🔧 Installation Steps (5-10 minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Update Prisma Schema
The schema has already been updated in `prisma/schema.prisma`
- Verified new notification models present
- Verified User model relationships added
- Generate Prisma Client:

```bash
npm run prisma:generate
```

### Step 3: Run Database Migration
```bash
npm run prisma:migrate -- --name add_notifications
```

When prompted for a migration name, confirm or provide: "add_notifications"

### Step 4: Seed Alert Rules
Add default alert rules to your database:

```bash
npm run prisma:seed
```

This creates 8 pre-configured alert rules for common scenarios.

---

## 📧 Email Configuration (Required for Email Notifications)

### Option A: Gmail (Easiest)
1. Enable 2-Factor Authentication on your Gmail account
2. Create an [App Password](https://support.google.com/accounts/answer/185833)
3. Add to `.env.local`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=noreply@kellyos.com
```

### Option B: SendGrid
1. Create SendGrid account and API key
2. Add to `.env.local`:
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.your-api-key
EMAIL_FROM=noreply@kellyos.com
```

### Option C: AWS SES
1. Set up AWS SES and verify sender email
2. Add to `.env.local`:
```env
EMAIL_HOST=email-smtp.region.amazonaws.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-smtp-username
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM=verified-email@domain.com
```

### Option D: Mailtrap (Development Only)
```env
EMAIL_HOST=live.smtp.mailtrap.io
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-mailtrap-user
EMAIL_PASSWORD=your-mailtrap-password
EMAIL_FROM=noreply@kellyos.com
```

### Test Email Configuration
```bash
# After setting up email provider
tsx scripts/test-email.ts
```

Expected output: `✅ Email transporter verified`

---

## 🎨 Frontend Integration (10 minutes)

### Step 1: Check Your Header Component
Open your header/layout file (likely `app/components/Header.tsx` or `app/layout.tsx`):

```typescript
'use client';

import { NotificationBell } from '@/app/components/NotificationBell';
import { useAuth } from '@/lib/auth'; // Your auth hook

export default function Header() {
  const { user } = useAuth();
  
  return (
    <header className="flex items-center justify-between p-4 bg-white shadow">
      {/* ...existing header content... */}
      
      {/* Add Notification Bell */}
      {user && <NotificationBell userId={user.id} />}
    </header>
  );
}
```

### Step 2: Add Alerts Panel to Dashboard
Open your dashboard page (`app/dashboard/page.tsx`):

```typescript
'use client';

import { AlertsPanel } from '@/app/components/AlertsPanel';

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4">
      {/* Add Alerts Panel at top */}
      <AlertsPanel maxVisible={3} />
      
      {/* ... rest of dashboard content ... */}
    </div>
  );
}
```

### Step 3: Add WebSocket to App Layout
The `useWebSocket` hook should be called in your main layout:

```typescript
// app/layout.tsx
'use client';

import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useEffect, useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>();
  
  // Get current user (adapt based on your auth)
  useEffect(() => {
    const fetchUser = async () => {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Initialize WebSocket
  useWebSocket(userId);
  
  return (
    <html>
      <body>
        {children}
      </body>
    </html>
  );
}
```

---

## 🚀 Backend Integration (20-30 minutes)

Pick one of these workflows to implement first, then expand to others.

### Example 1: Payment Processing Notifications

Find your payment creation endpoint (likely at `app/api/payments/route.ts`):

```typescript
import { createNotification, NotificationType } from '@/lib/notification-service';
import { triggerAlerts, AlertEventType } from '@/lib/alert-manager';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const payment = await prisma.payment.create({ data: body });
  
  // ✨ Add these lines ✨
  
  // 1. Notify user of successful payment
  await createNotification({
    userId: payment.createdBy,
    type: NotificationType.PAYMENT_RECEIVED,
    title: `Payment of $${payment.amount} Received`,
    message: `From: ${payment.customerName}`,
    severity: 'INFO',
    relatedEntityId: payment.id,
    relatedEntityType: 'PAYMENT',
    actionUrl: `/dashboard/payments/${payment.id}`,
  });

  // 2. Alert for large payments
  if (payment.amount > 50000) {
    await triggerAlerts({
      eventType: AlertEventType.HIGH_VALUE_PAYMENT,
      values: {
        amount: payment.amount,
        customerName: payment.customerName,
      },
    });
  }

  return successResponse({ data: payment });
}
```

### Example 2: Reconciliation Completion

Find your reconciliation completion endpoint:

```typescript
import { createNotification, NotificationType } from '@/lib/notification-service';

async function finalizeReconciliation(result: any, userId: string) {
  // ✨ Add notification ✨
  
  await createNotification({
    userId,
    type: NotificationType.RECONCILIATION_COMPLETE,
    title: 'Reconciliation Complete',
    message: `${result.matched} of ${result.total} transactions matched`,
    severity: result.unmatched > 0 ? 'WARNING' : 'INFO',
    actionUrl: '/dashboard/reconciliation',
    metadata: {
      matched: result.matched,
      total: result.total,
      unmatched: result.unmatched,
    },
  });
}
```

### Example 3: Approval Workflows

```typescript
import { createNotification, NotificationType } from '@/lib/notification-service';

async function requestApproval(expense: any, approverId: string) {
  await createNotification({
    userId: approverId,
    type: NotificationType.APPROVAL_REQUIRED,
    title: `Approval Needed: $${expense.amount}`,
    message: `${expense.description} - Category: ${expense.category}`,
    severity: 'WARNING',
    actionUrl: `/dashboard/expenses/${expense.id}/approve`,
    metadata: {
      amount: expense.amount,
      category: expense.category,
      submittedBy: expense.submittedByName,
    },
    sendEmail: true, // Send email too
  });
}
```

---

## ✅ Verification Steps

### 1. Test Notification Creation
```bash
# Start your app in development
npm run dev

# In another terminal, test API
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "userId": "your-user-id",
    "type": "SYSTEM_ALERT",
    "title": "Test Notification",
    "message": "This is a test",
    "severity": "INFO"
  }'
```

### 2. Check Database
```bash
# Open Prisma Studio
npm run prisma:studio

# Navigate to notifications table
# You should see the test notification you created
```

### 3. Test Frontend Components
- Open your dashboard in browser
- Look for notification bell in header
- Look for alerts panel
- Click bell icon to open notification center
- Verify notifications appear with correct styling

### 4. Test WebSocket Connection
In browser DevTools Console (F12):
```javascript
// Check WebSocket connection status
window.location // Look for WebSocket connection in Network tab
// Or check if 'Online' indicator shows green in NotificationBell
```

### 5. Test Email (if configured)
```bash
tsx scripts/test-email.ts
```

Should output: `✅ Email transporter verified`

---

## 🎯 Next Actions

### Immediate (Today)
- [ ] Run database migration
- [ ] Configure email provider
- [ ] Add NotificationBell component
- [ ] Test dashboard loads without errors

### Short Term (This Week)
- [ ] Add AlertsPanel to dashboard
- [ ] Integrate notifications into payment workflow
- [ ] Test email delivery
- [ ] Train team on new notification features

### Medium Term (This Month)
- [ ] Create custom alert rules for your business
- [ ] Set up scheduled notification jobs (digests, reminders)
- [ ] Integrate with all major workflows
- [ ] Monitor and optimize performance

### Long Term (Q1 2026)
- [ ] Implement Redis caching
- [ ] Add advanced reporting on alerts
- [ ] Create webhook integrations
- [ ] Build analytics dashboard

---

## 🆘 Troubleshooting

### Notifications not appearing in UI
1. Check browser console for errors (F12)
2. Verify WebSocket connection: Network tab → WS
3. Clear browser cache and reload
4. Check `/api/notifications` returns data

### Emails not sending
1. Run: `tsx scripts/test-email.ts`
2. Check email provider credentials in `.env.local`
3. Check `notification_logs` table for errors
4. Ensure sender email is verified with provider

### Database migration fails
1. Check database is accessible
2. Verify no conflicting migration names
3. Run: `npx prisma migrate resolve --rolled_back`
4. Try again: `npm run prisma:migrate`

### WebSocket connection fails
1. Check `NEXT_PUBLIC_APP_URL` is set correctly
2. Verify Socket.IO is initialized in your server
3. Check CORS settings allow WebSocket
4. Check browser console for connection errors

For more help, see `NOTIFICATIONS_INTEGRATION_GUIDE.md` section "Troubleshooting"

---

## 📚 Documentation Files

- **Implementation Summary** → `NOTIFICATIONS_IMPLEMENTATION_SUMMARY.md`
  - Overview of what was built
  - Architecture diagram
  - Feature list

- **Integration Guide** → `NOTIFICATIONS_INTEGRATION_GUIDE.md`
  - Complete step-by-step instructions
  - Environment setup
  - Testing procedures
  - Production deployment

- **Usage Reference** → `NOTIFICATIONS_USAGE_REFERENCE.md`
  - Code examples
  - Common integration patterns
  - Quick copy-paste snippets

- **This File** → `NOTIFICATIONS_QUICK_START.md`
  - Setup checklist
  - Verification steps
  - Troubleshooting

---

## 💡 Pro Tips

1. **Start Small**: Integrate notifications for one workflow first (payments), then expand
2. **Test Thoroughly**: Verify emails deliver before trusting them
3. **Monitor Logs**: Keep an eye on `notification_logs` table for issues
4. **User Education**: Let your team know about the new notification features
5. **Gather Feedback**: Ask users what alerts they want to see

---

**Estimated Time to Full Implementation**: 2-4 hours  
**Difficulty Level**: Medium (straightforward integration)  
**Support**: Refer to inline code comments for detailed explanations

Good luck! 🎉
