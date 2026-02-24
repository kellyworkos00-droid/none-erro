import nodemailer from 'nodemailer';

// Email transporter configuration
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 * Configure based on your email service provider
 */
function getTransporter() {
  if (transporter) return transporter;

  // Use environment variables to configure email service
  // For development, you can use a test account or service like Mailtrap
  // For production, use your actual email service (SendGrid, AWS SES, Gmail, etc.)

  const emailConfig = {
    host: process.env.EMAIL_HOST || 'localhost',
    port: parseInt(process.env.EMAIL_PORT || '1025'),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
      ? {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        }
      : undefined,
  };

  transporter = nodemailer.createTransport(emailConfig);
  return transporter;
}

export interface EmailOptions {
  to: string;
  subject: string;
  type: 'notification' | 'approval' | 'reminder' | 'alert' | 'summary';
  notificationTitle?: string;
  notificationMessage?: string;
  actionUrl?: string;
  actionText?: string;
  recipientName?: string;
  details?: Record<string, unknown>;
  html?: string;
}

/**
 * Generate HTML email template
 */
function generateEmailTemplate(options: EmailOptions): string {
  const {
    type,
    notificationTitle,
    notificationMessage,
    actionUrl,
    actionText = 'View Details',
    recipientName = 'User',
    details,
  } = options;

  const brandColor = '#3B82F6';
  const primaryButton = actionUrl
    ? `<a href="${actionUrl}" style="display: inline-block; padding: 12px 24px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px;">${actionText}</a>`
    : '';

  const detailsHtml = details
    ? `
    <div style="margin-top: 20px; padding: 15px; background-color: #f3f4f6; border-radius: 4px;">
      <h3 style="margin-top: 0; color: #1f2937;">Details:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        ${Object.entries(details)
          .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
          .join('')}
      </ul>
    </div>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: white;
        }
        .header {
          border-bottom: 3px solid ${brandColor};
          padding-bottom: 15px;
          margin-bottom: 20px;
        }
        .header h1 {
          margin: 0;
          color: ${brandColor};
          font-size: 24px;
        }
        .content {
          padding: 20px 0;
        }
        .content h2 {
          color: #1f2937;
          font-size: 18px;
          margin-top: 0;
        }
        .footer {
          border-top: 1px solid #e5e7eb;
          padding-top: 15px;
          margin-top: 30px;
          font-size: 12px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Kelly OS Notification</h1>
        </div>
        <div class="content">
          <p>Hi ${recipientName},</p>
          ${notificationTitle ? `<h2>${notificationTitle}</h2>` : ''}
          ${notificationMessage ? `<p>${notificationMessage}</p>` : ''}
          ${detailsHtml}
          ${primaryButton}
        </div>
        <div class="footer">
          <p>This is an automated notification from Kelly OS ERP System.</p>
          <p>You can manage your notification preferences in your account settings.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send email notification
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = getTransporter();

    // Skip email sending in development if not configured
    if (!process.env.EMAIL_USER && process.env.NODE_ENV !== 'production') {
      console.log('📧 Email (not sent in dev mode):', {
        to: options.to,
        subject: options.subject,
        type: options.type,
      });
      return;
    }

    const html = options.html || generateEmailTemplate(options);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@kellyos.com',
      to: options.to,
      subject: options.subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
}

/**
 * Send payment reminder email
 */
export async function sendPaymentReminderEmail(
  userEmail: string,
  invoiceNumber: string,
  dueAmount: number,
  dueDate: string,
  invoiceUrl: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `Payment Reminder: Invoice ${invoiceNumber}`,
    type: 'reminder',
    notificationTitle: 'Payment Reminder',
    notificationMessage: `You have an outstanding invoice that requires payment.`,
    actionUrl: invoiceUrl,
    actionText: 'View Invoice',
    details: {
      'Invoice Number': invoiceNumber,
      'Amount Due': `$${dueAmount.toFixed(2)}`,
      'Due Date': dueDate,
    },
  });
}

/**
 * Send approval required email
 */
export async function sendApprovalRequiredEmail(
  userEmail: string,
  itemType: string,
  itemNumber: string,
  approverNames: string,
  approvalUrl: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `Approval Required: ${itemType} ${itemNumber}`,
    type: 'approval',
    notificationTitle: 'Approval Required',
    notificationMessage: `A new ${itemType} requires your approval.`,
    actionUrl: approvalUrl,
    actionText: 'Review & Approve',
    details: {
      'Item Type': itemType,
      'Item Number': itemNumber,
      'Requested By': approverNames,
    },
  });
}

/**
 * Send exception alert email
 */
export async function sendExceptionAlertEmail(
  userEmail: string,
  alertType: string,
  description: string,
  severity: string,
  details: Record<string, unknown>,
  actionUrl?: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: `${severity} Alert: ${alertType}`,
    type: 'alert',
    notificationTitle: `${severity} Alert: ${alertType}`,
    notificationMessage: description,
    actionUrl: actionUrl,
    actionText: 'View Details',
    details,
  });
}

/**
 * Send daily digest email
 */
export async function sendDigestEmail(
  userEmail: string,
  userName: string,
  summary: {
    newNotificationsCount: number;
    pendingApprovalsCount: number;
    failedMatchesCount: number;
    overdueDays: number;
    alertsCount: number;
  },
  dashboardUrl: string
): Promise<void> {
  await sendEmail({
    to: userEmail,
    subject: 'Daily Summary - Kelly OS ERP System',
    type: 'summary',
    notificationTitle: 'Your Daily Summary',
    notificationMessage: 'Here is your daily activity summary from Kelly OS.',
    actionUrl: dashboardUrl,
    actionText: 'View Dashboard',
    recipientName: userName,
    details: {
      'New Notifications': summary.newNotificationsCount,
      'Pending Approvals': summary.pendingApprovalsCount,
      'Failed Matches': summary.failedMatchesCount,
      'System Alerts': summary.alertsCount,
    },
  });
}

/**
 * Verify email transporter connection (for setup/testing)
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.verify();
    console.log('✅ Email transporter verified');
    return true;
  } catch (error) {
    console.error('❌ Email transporter verification failed:', error);
    return false;
  }
}
