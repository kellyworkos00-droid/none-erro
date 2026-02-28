/**
 * Customer Messaging Service for Kelly OS
 * Send custom SMS messages to customers (individual or bulk)
 */

import prisma from '@/lib/prisma';
import { sendSms, sendBulkSms } from '@/lib/sms-service';

export interface MessageRecipient {
  customerId: string;
  customerName: string;
  phone: string;
}

export interface SendMessageOptions {
  recipients: MessageRecipient[];
  message: string;
  senderId: string;
  category?: 'GENERAL' | 'PROMOTION' | 'REMINDER' | 'ANNOUNCEMENT' | 'PAYMENT';
}

export interface MessageResult {
  success: boolean;
  totalRecipients: number;
  successCount: number;
  failedCount: number;
  results: Array<{
    customerId: string;
    customerName: string;
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
    cost?: number;
  }>;
  totalCost: number;
}

/**
 * Send message to single customer
 */
export async function sendMessageToCustomer(
  customerId: string,
  message: string
): Promise<MessageResult> {
  try {
    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    if (!customer) {
      return {
        success: false,
        totalRecipients: 1,
        successCount: 0,
        failedCount: 1,
        results: [{
          customerId,
          customerName: 'Unknown',
          phone: '',
          success: false,
          error: 'Customer not found',
        }],
        totalCost: 0,
      };
    }

    if (!customer.phone) {
      return {
        success: false,
        totalRecipients: 1,
        successCount: 0,
        failedCount: 1,
        results: [{
          customerId: customer.id,
          customerName: customer.name,
          phone: '',
          success: false,
          error: 'Customer has no phone number',
        }],
        totalCost: 0,
      };
    }

    // Send SMS
    const smsResult = await sendSms({
      to: customer.phone,
      message,
      type: 'notification',
    });

    return {
      success: smsResult.success,
      totalRecipients: 1,
      successCount: smsResult.success ? 1 : 0,
      failedCount: smsResult.success ? 0 : 1,
      results: [{
        customerId: customer.id,
        customerName: customer.name,
        phone: customer.phone,
        success: smsResult.success,
        messageId: smsResult.messageId,
        error: smsResult.error,
        cost: smsResult.cost,
      }],
      totalCost: smsResult.cost || 0,
    };
  } catch (error) {
    console.error('Error sending message to customer:', error);
    return {
      success: false,
      totalRecipients: 1,
      successCount: 0,
      failedCount: 1,
      results: [{
        customerId,
        customerName: 'Unknown',
        phone: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
      totalCost: 0,
    };
  }
}

/**
 * Send message to multiple customers (bulk messaging)
 */
export async function sendBulkMessage(
  options: SendMessageOptions
): Promise<MessageResult> {
  const { recipients, message } = options;

  if (recipients.length === 0) {
    return {
      success: false,
      totalRecipients: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      totalCost: 0,
    };
  }

  // Validate recipients have phone numbers
  const validRecipients = recipients.filter(r => r.phone);
  const invalidRecipients = recipients.filter(r => !r.phone);

  // Prepare bulk SMS recipients
  const smsRecipients = validRecipients.map(recipient => ({
    phone: recipient.phone,
    message,
  }));

  // Send bulk SMS
  const smsResults = await sendBulkSms(smsRecipients, 100);

  // Compile results
  const results = validRecipients.map((recipient, index) => ({
    customerId: recipient.customerId,
    customerName: recipient.customerName,
    phone: recipient.phone,
    success: smsResults[index].success,
    messageId: smsResults[index].messageId,
    error: smsResults[index].error,
    cost: smsResults[index].cost,
  }));

  // Add invalid recipients to results
  invalidRecipients.forEach(recipient => {
    results.push({
      customerId: recipient.customerId,
      customerName: recipient.customerName,
      phone: recipient.phone || '',
      success: false,
      messageId: undefined,
      error: 'No phone number',
      cost: undefined,
    });
  });

  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);

  return {
    success: successCount > 0,
    totalRecipients: recipients.length,
    successCount,
    failedCount,
    results,
    totalCost,
  };
}

/**
 * Send message to all customers with outstanding balance
 */
export async function sendMessageToCustomersWithBalance(
  message: string,
  senderId: string,
  minBalance: number = 0
): Promise<MessageResult> {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        currentBalance: { gt: minBalance },
        phone: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
      },
    });

    const recipients: MessageRecipient[] = customers.map(c => ({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone!,
    }));

    return await sendBulkMessage({
      recipients,
      message,
      senderId,
      category: 'PAYMENT',
    });
  } catch (error) {
    console.error('Error sending messages to customers with balance:', error);
    return {
      success: false,
      totalRecipients: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      totalCost: 0,
    };
  }
}

/**
 * Send message to all active customers
 */
export async function sendMessageToAllCustomers(
  message: string,
  senderId: string,
  category?: 'GENERAL' | 'PROMOTION' | 'REMINDER' | 'ANNOUNCEMENT' | 'PAYMENT'
): Promise<MessageResult> {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        phone: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });

    const recipients: MessageRecipient[] = customers.map(c => ({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone!,
    }));

    return await sendBulkMessage({
      recipients,
      message,
      senderId,
      category: category || 'ANNOUNCEMENT',
    });
  } catch (error) {
    console.error('Error sending messages to all customers:', error);
    return {
      success: false,
      totalRecipients: 0,
      successCount: 0,
      failedCount: 0,
      results: [],
      totalCost: 0,
    };
  }
}

/**
 * Get customers by filter for targeted messaging
 */
export async function getCustomersForMessaging(filter?: {
  hasBalance?: boolean;
  minBalance?: number;
  hasOverdueInvoices?: boolean;
  customerIds?: string[];
}): Promise<MessageRecipient[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      phone: { not: null },
      isActive: true,
    };

    if (filter?.hasBalance) {
      where.currentBalance = { gt: filter.minBalance || 0 };
    }

    if (filter?.customerIds && filter.customerIds.length > 0) {
      where.id = { in: filter.customerIds };
    }

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        name: true,
        phone: true,
        currentBalance: true,
      },
      orderBy: { name: 'asc' },
    });

    return customers.map(c => ({
      customerId: c.id,
      customerName: c.name,
      phone: c.phone!,
    }));
  } catch (error) {
    console.error('Error getting customers for messaging:', error);
    return [];
  }
}

/**
 * Message templates
 */
export const MESSAGE_TEMPLATES = {
  PAYMENT_REMINDER: (customerName: string, balance: number) =>
    `Hi ${customerName},\n\nThis is a friendly reminder that you have an outstanding balance of KES ${balance.toLocaleString()}.\n\nPlease contact us to arrange payment.\n\nThank you,\nElegant Steel`,

  PROMOTION: (customerName: string, discount: number) =>
    `Hi ${customerName},\n\nSpecial offer! Get ${discount}% off your next order.\n\nContact us today to take advantage of this limited-time offer.\n\nElegant Steel`,

  DELIVERY_NOTIFICATION: (customerName: string, orderNumber: string) =>
    `Hi ${customerName},\n\nYour order ${orderNumber} has been dispatched and will be delivered soon.\n\nThank you for your business!\n\nElegant Steel`,

  GENERAL_ANNOUNCEMENT: (customerName: string, announcement: string) =>
    `Hi ${customerName},\n\n${announcement}\n\nThank you,\nElegant Steel`,

  THANK_YOU: (customerName: string) =>
    `Hi ${customerName},\n\nThank you for your business! We appreciate your continued support.\n\nElegant Steel`,

  NEW_PRODUCT: (customerName: string, productName: string) =>
    `Hi ${customerName},\n\nWe have a new product: ${productName}!\n\nContact us for more details and pricing.\n\nElegant Steel`,
};
