# SMS Reminder System for Kelly OS

## Overview

The SMS Reminder System allows you to send automated SMS notifications to customers for overdue invoices. The system supports two popular SMS providers: **Africa's Talking** (recommended for African markets) and **Twilio** (global coverage).

## Features

✅ **Invoice SMS Reminders** - Send payment reminders to customers via SMS
✅ **Overdue Detection** - Automatically calculates days overdue and adjusts message tone
✅ **Multi-Provider Support** - Supports Africa's Talking and Twilio
✅ **Phone Number Validation** - Automatic formatting and validation for Kenya numbers
✅ **Audit Logging** - Complete audit trail of all SMS sent
✅ **Cost Tracking** - Records SMS delivery cost for each message
✅ **Bulk SMS** - Send SMS to multiple recipients in batches
✅ **Smart Message Formatting** - Contextual messages based on invoice status

## Setup Instructions

### Option 1: Africa's Talking (Recommended for Kenya)

Africa's Talking is the most popular SMS provider in Africa with excellent rates and reliability in Kenya.

#### 1. Create Account

1. Go to [https://africastalking.com](https://africastalking.com)
2. Sign up for a free account
3. Verify your account and add credits
4. Go to Settings → API Key to get your credentials

#### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# SMS Provider Configuration
SMS_PROVIDER=africastalking

# Africa's Talking Credentials
AFRICAS_TALKING_USERNAME=your_username
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_SENDER_ID=KELLY_OS
```

**Environment Variables Explained:**
- `SMS_PROVIDER` - Set to `africastalking` to use Africa's Talking
- `AFRICAS_TALKING_USERNAME` - Your Africa's Talking username (usually "sandbox" for testing)
- `AFRICAS_TALKING_API_KEY` - Your API key from the dashboard
- `AFRICAS_TALKING_SENDER_ID` - Sender name shown to recipients (max 11 characters)

#### 3. Test Configuration

To test your setup, you can use the sandbox mode:

```env
AFRICAS_TALKING_USERNAME=sandbox
AFRICAS_TALKING_API_KEY=your_sandbox_api_key
```

In sandbox mode, SMS will only be sent to numbers you've registered in your Africa's Talking dashboard.

#### 4. Go Live

Once tested, switch to production:

```env
AFRICAS_TALKING_USERNAME=your_production_username
AFRICAS_TALKING_API_KEY=your_production_api_key
```

### Option 2: Twilio (Global Coverage)

Twilio provides SMS services globally with excellent reliability.

#### 1. Create Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free trial account
3. Get your Account SID and Auth Token from the console
4. Buy a phone number or use the trial number

#### 2. Configure Environment Variables

Add these to your `.env` file:

```env
# SMS Provider Configuration
SMS_PROVIDER=twilio

# Twilio Credentials
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Environment Variables Explained:**
- `SMS_PROVIDER` - Set to `twilio` to use Twilio
- `TWILIO_ACCOUNT_SID` - Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Your Twilio Auth Token
- `TWILIO_PHONE_NUMBER` - Your Twilio phone number (must include country code)

## Usage

### 1. Send SMS from Invoices Page

#### Via Table Actions

1. Navigate to **Dashboard → Invoices**
2. Find the invoice you want to send a reminder for
3. Click the orange **SMS** button (📱 icon)
4. The SMS will be sent immediately

**Note:** The SMS button only appears for:
- Invoices that are NOT paid
- Customers who have a phone number on file

#### Via Invoice Details Modal

1. Click **View** on any invoice
2. In the details modal, click **Send SMS Reminder**
3. The SMS will be sent and the modal will close

### 2. Phone Number Format

The system automatically handles phone number formatting for Kenya:

**Accepted Formats:**
- `0712345678` → Converted to `+254712345678`
- `712345678` → Converted to `+254712345678`
- `254712345678` → Converted to `+254712345678`
- `+254712345678` → Used as-is

For international numbers, always include the country code with `+`.

### 3. SMS Message Templates

The system automatically customizes messages based on invoice status:

#### Overdue Invoice (Past Due Date)

```
Hi Customer Name,

Your invoice INV-2024-001 is OVERDUE by 7 days.

Amount due: KES 15,000.00
Due date: Jan 15, 2024

Please settle this invoice urgently to avoid service interruption.

Thank you,
Kelly OS
```

#### Due Today

```
Hi Customer Name,

Invoice INV-2024-001 is DUE TODAY.

Amount due: KES 15,000.00

Please process payment today to avoid late charges.

Thank you,
Kelly OS
```

#### Upcoming Payment

```
Hi Customer Name,

Payment reminder for invoice INV-2024-001.

Amount due: KES 15,000.00
Due date: Feb 20, 2024 (5 days)

Thank you for your business!

Kelly OS
```

### 4. Audit Trail

Every SMS sent is logged in the audit system:

**Logged Information:**
- ✅ User who sent the SMS
- ✅ Invoice number and customer name
- ✅ Customer phone number
- ✅ Balance amount
- ✅ Days overdue
- ✅ SMS provider used
- ✅ Message ID from provider
- ✅ Cost of sending (if provided by provider)
- ✅ Timestamp

**View Audit Logs:**
1. Go to **Dashboard → Reports → Audit Logs**
2. Filter by action: `SEND_SMS_REMINDER`
3. View complete details of all SMS sent

## API Reference

### Send SMS Reminder Endpoint

```
POST /api/invoices/[id]/send-sms-reminder
```

**Authentication:** Required (Bearer token)

**Permissions:** `invoice.manage`

**Request:**
```bash
curl -X POST \
  https://your-domain.com/api/invoices/clx123abc/send-sms-reminder \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json'
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "message": "SMS reminder sent successfully",
    "sms": {
      "messageId": "ATXid_abc123...",
      "provider": "africastalking",
      "cost": 0.80
    }
  }
}
```

**Response (Error - No Phone Number):**
```json
{
  "error": {
    "message": "Customer does not have a phone number on file",
    "code": "VALIDATION_ERROR"
  }
}
```

**Response (Error - Already Paid):**
```json
{
  "error": {
    "message": "Invoice is already paid"
  }
}
```

### Programmatic SMS Sending

You can also send SMS programmatically using the SMS service:

```typescript
import { sendInvoiceReminderSms, sendNotificationSms } from '@/lib/sms-service';

// Send invoice reminder
const result = await sendInvoiceReminderSms(
  '+254712345678',           // Customer phone
  'Acme Corporation',        // Customer name
  'INV-2024-001',           // Invoice number
  15000,                     // Total amount
  7500,                      // Balance amount
  new Date('2024-01-15'),   // Due date
  7                          // Days overdue
);

if (result.success) {
  console.log('SMS sent!', result.messageId);
  console.log('Cost:', result.cost);
} else {
  console.error('Failed:', result.error);
}

// Send custom notification SMS
const notifResult = await sendNotificationSms(
  '+254712345678',
  'Payment Received',
  'Your payment of KES 5,000 has been received. Thank you!'
);
```

## Cost Guidelines

### Africa's Talking Pricing (Kenya)

**Standard SMS:**
- Kenya: ~KES 0.80 per SMS
- East Africa: ~KES 3.00 per SMS
- Other Africa: Varies by country

**Message Length:**
- 160 characters = 1 SMS
- 161-320 characters = 2 SMS
- 321-480 characters = 3 SMS
- Maximum: 1530 characters (10 SMS)

### Twilio Pricing

**Standard SMS:**
- Kenya: ~$0.0645 per SMS (KES 8.00)
- USA/Canada: ~$0.0075 per SMS
- Other countries: Varies

**Important:**
- Twilio is more expensive but has better global coverage
- Use Africa's Talking for Kenya/Africa
- Use Twilio for international customers

## Best Practices

### 1. Timing

**When to Send SMS:**
- ✅ 3 days before due date (reminder)
- ✅ On due date (urgent reminder)
- ✅ 1, 7, 14, 30 days after due date (overdue reminders)

**When NOT to Send:**
- ❌ Late night (after 9 PM)
- ❌ Too frequently (max once per day)
- ❌ For already paid invoices

### 2. Customer Experience

- Keep messages professional but friendly
- Always include invoice number and amount
- Provide clear deadline/overdue information
- Include your business name
- Make it easy to contact you for payment issues

### 3. Compliance

**Kenya:**
- Get customer consent for SMS notifications
- Provide opt-out option
- Keep records of all communications
- Follow Data Protection Act regulations

**General:**
- Don't send marketing SMS without explicit consent
- Respect opt-out requests immediately
- Keep SMS transactional (invoices, payments, orders)

## Troubleshooting

### SMS Not Sending

**1. Check Configuration**
```bash
# Verify environment variables are set
echo $SMS_PROVIDER
echo $AFRICAS_TALKING_API_KEY
```

**2. Check Logs**
- Check application logs for error messages
- Look for "SMS error" or "Failed to send SMS"
- Check audit logs for failed attempts

**3. Verify Credits**
- Africa's Talking: Check your account balance
- Twilio: Check your account balance and verify phone number

**4. Test Phone Number**
```typescript
import { verifySmsConfiguration } from '@/lib/sms-service';

const config = verifySmsConfiguration();
console.log('Configured:', config.configured);
console.log('Provider:', config.provider);
console.log('Errors:', config.errors);
```

### Common Errors

**"SMS provider not configured"**
- Set `SMS_PROVIDER` environment variable to either `africastalking` or `twilio`

**"Invalid phone number format"**
- Ensure phone number is in international format
- For Kenya: Use +254 prefix or 07XX format

**"Customer does not have a phone number on file"**
- Add phone number to customer record
- Go to Customers → Edit → Add phone number

**"Insufficient balance"**
- Top up your Africa's Talking or Twilio account
- Check account balance in provider dashboard

**"Message delivery failed"**
- Verify phone number is correct and active
- Check if customer has opted out
- Verify network coverage

## Integration with Notifications

SMS reminders work alongside the notification system:

**Automatic Notifications:**
- When SMS is sent successfully → Success notification shown
- When SMS fails → Error notification shown
- All SMS attempts logged in audit system

**Manual Triggers:**
- User clicks SMS button → SMS sent → Toast notification
- API call → SMS sent → Response with delivery status

## Bulk SMS Feature

Send SMS to multiple customers at once:

```typescript
import { sendBulkSms } from '@/lib/sms-service';

const recipients = [
  {
    phone: '+254712345678',
    message: 'Your payment is due...',
  },
  {
    phone: '+254723456789',
    message: 'Your payment is overdue...',
  },
  // ... more recipients
];

// Send in batches of 100 with 1 second delay between batches
const results = await sendBulkSms(recipients, 100);

// Check results
const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`Sent: ${successful}, Failed: ${failed}`);
```

## Future Enhancements

**Planned Features:**
- 📅 Scheduled SMS reminders (automatic)
- 📊 SMS analytics dashboard
- 🎯 Customer SMS preferences
- 🌍 WhatsApp integration
- 🤖 Two-way SMS (replies)
- 📱 SMS templates customization
- 🔔 Bulk overdue invoice reminders

## Support

**SMS Provider Issues:**
- Africa's Talking: [support@africastalking.com](mailto:support@africastalking.com)
- Twilio: [https://support.twilio.com](https://support.twilio.com)

**Kelly OS Issues:**
- Check documentation: `/DOCUMENTATION_INDEX.md`
- Review audit logs for errors
- Check application logs

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to version control
- Keep API keys secure and rotate regularly
- Use environment variables for production
- Monitor SMS usage to detect abuse
- Enable rate limiting for SMS endpoints
- Track costs to avoid unexpected bills

## Summary

The SMS Reminder System is now fully integrated into Kelly OS:

✅ **Setup** - Configure Africa's Talking or Twilio
✅ **Usage** - Click SMS button on any unpaid invoice
✅ **Tracking** - All SMS logged in audit system
✅ **Cost-Effective** - ~KES 0.80 per SMS with Africa's Talking
✅ **Smart** - Auto-formats phone numbers and customizes messages
✅ **Professional** - Well-formatted, contextual messages

Start sending SMS reminders to improve your cash flow and reduce overdue invoices! 📱💰
