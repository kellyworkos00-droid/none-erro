import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import {
  sendMessageToCustomer,
  sendBulkMessage,
  sendMessageToAllCustomers,
  sendMessageToCustomersWithBalance,
  getCustomersForMessaging,
} from '@/lib/message-service';
import { ValidationError } from '@/lib/errors';
import { z } from 'zod';

// Validation schemas
const sendSingleMessageSchema = z.object({
  customerId: z.string().cuid('Invalid customer ID'),
  message: z.string().min(1, 'Message is required').max(1530, 'Message is too long (max 1530 characters)'),
  category: z.enum(['GENERAL', 'PROMOTION', 'REMINDER', 'ANNOUNCEMENT', 'PAYMENT']).optional(),
});

const sendBulkMessageSchema = z.object({
  customerIds: z.array(z.string().cuid()).min(1, 'At least one customer is required'),
  message: z.string().min(1, 'Message is required').max(1530, 'Message is too long'),
  category: z.enum(['GENERAL', 'PROMOTION', 'REMINDER', 'ANNOUNCEMENT', 'PAYMENT']).optional(),
});

const sendToGroupSchema = z.object({
  group: z.enum(['all', 'with_balance', 'overdue']),
  message: z.string().min(1, 'Message is required').max(1530, 'Message is too long'),
  category: z.enum(['GENERAL', 'PROMOTION', 'REMINDER', 'ANNOUNCEMENT', 'PAYMENT']).optional(),
  minBalance: z.number().optional(),
});

/**
 * POST /api/messages/send
 * Send custom message to single customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'customer.manage');
    const body = await request.json();

    // Determine which type of message to send
    if (body.customerId) {
      // Single customer
      const parsed = sendSingleMessageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { customerId, message } = parsed.data;

      const result = await sendMessageToCustomer(customerId, message);

      // Log the message send attempt
      await createAuditLog({
        userId: user.userId,
        action: 'SEND_SMS_REMINDER',
        entityType: 'Customer',
        entityId: customerId,
        description: `Sent custom message to customer`,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          messageLength: message.length,
          success: result.success,
          cost: result.totalCost,
        },
      });

      return NextResponse.json(
        createSuccessResponse({
          message: result.success ? 'Message sent successfully' : 'Failed to send message',
          result,
        })
      );
    } else if (body.customerIds) {
      // Bulk send to specific customers
      const parsed = sendBulkMessageSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { customerIds, message, category } = parsed.data;

      // Get customer details
      const customers = await prisma.customer.findMany({
        where: { id: { in: customerIds } },
        select: { id: true, name: true, phone: true },
      });

      const recipients = customers
        .filter(c => c.phone)
        .map(c => ({
          customerId: c.id,
          customerName: c.name,
          phone: c.phone!,
        }));

      const result = await sendBulkMessage({
        recipients,
        message,
        senderId: user.userId,
        category,
      });

      // Log bulk send
      await createAuditLog({
        userId: user.userId,
        action: 'SEND_SMS_REMINDER',
        entityType: 'BulkMessage',
        entityId: user.userId,
        description: `Sent bulk message to ${result.totalRecipients} customers`,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          totalRecipients: result.totalRecipients,
          successCount: result.successCount,
          failedCount: result.failedCount,
          totalCost: result.totalCost,
          category: category || 'GENERAL',
        },
      });

      return NextResponse.json(
        createSuccessResponse({
          message: `Message sent to ${result.successCount} of ${result.totalRecipients} customers`,
          result,
        })
      );
    } else if (body.group) {
      // Send to group (all, with_balance, overdue)
      const parsed = sendToGroupSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          createErrorResponse('Validation error', 'VALIDATION_ERROR', parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { group, message, minBalance } = parsed.data;

      let result;
      if (group === 'all') {
        result = await sendMessageToAllCustomers(message, user.userId);
      } else if (group === 'with_balance') {
        result = await sendMessageToCustomersWithBalance(message, user.userId, minBalance || 0);
      } else {
        return NextResponse.json(
          createErrorResponse('Invalid group type', 'INVALID_GROUP'),
          { status: 400 }
        );
      }

      // Log group send
      await createAuditLog({
        userId: user.userId,
        action: 'SEND_SMS_REMINDER',
        entityType: 'GroupMessage',
        entityId: user.userId,
        description: `Sent message to group: ${group}`,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          group,
          totalRecipients: result.totalRecipients,
          successCount: result.successCount,
          failedCount: result.failedCount,
          totalCost: result.totalCost,
        },
      });

      return NextResponse.json(
        createSuccessResponse({
          message: `Message sent to ${result.successCount} of ${result.totalRecipients} customers`,
          result,
        })
      );
    } else {
      throw new ValidationError('Invalid request: must specify customerId, customerIds, or group');
    }
  } catch (error) {
    console.error('Error sending message:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse('Failed to send message', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}

/**
 * GET /api/messages/send?filter=...
 * Get list of customers for messaging (with filters)
 */
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'customer.view');

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const minBalance = searchParams.get('minBalance');
    const customerIds = searchParams.get('customerIds');

    const filterOptions: {
      hasBalance?: boolean;
      minBalance?: number;
      hasOverdueInvoices?: boolean;
      customerIds?: string[];
    } = {};

    if (filter === 'with_balance') {
      filterOptions.hasBalance = true;
      if (minBalance) {
        filterOptions.minBalance = parseFloat(minBalance);
      }
    }

    if (customerIds) {
      filterOptions.customerIds = customerIds.split(',');
    }

    const customers = await getCustomersForMessaging(filterOptions);

    return NextResponse.json(
      createSuccessResponse({
        customers,
        total: customers.length,
      })
    );
  } catch (error) {
    console.error('Error getting customers for messaging:', error);
    return NextResponse.json(
      createErrorResponse('Failed to get customers', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
