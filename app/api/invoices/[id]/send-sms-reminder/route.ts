import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { sendInvoiceReminderSms } from '@/lib/sms-service';
import { NotFoundError, ValidationError } from '@/lib/errors';

/**
 * POST /api/invoices/[id]/send-sms-reminder
 * Send SMS reminder to customer for overdue invoice
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requirePermission(request, 'invoice.manage');
    const invoiceId = params.id;

    // Fetch invoice with customer details
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Check if customer has a phone number
    if (!invoice.customer.phone) {
      throw new ValidationError('Customer does not have a phone number on file');
    }

    // Calculate days overdue
    const today = new Date();
    const dueDate = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Send SMS reminder
    const smsResult = await sendInvoiceReminderSms(
      invoice.customer.phone,
      invoice.customer.name,
      invoice.invoiceNumber,
      invoice.totalAmount,
      invoice.balanceAmount,
      dueDate,
      daysOverdue
    );

    if (!smsResult.success) {
      // Log failed attempt
      await createAuditLog({
        userId: user.userId,
        action: 'SEND_SMS_REMINDER',
        entityType: 'Invoice',
        entityId: invoice.id,
        description: `Failed to send SMS reminder for invoice ${invoice.invoiceNumber} to ${invoice.customer.name}`,
        ipAddress: getClientIp(request.headers),
        userAgent: getUserAgent(request.headers),
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customer.name,
          customerPhone: invoice.customer.phone,
          balanceAmount: invoice.balanceAmount,
          daysOverdue,
          error: smsResult.error,
          provider: smsResult.provider,
        },
      });

      return NextResponse.json(
        createErrorResponse(
          smsResult.error || 'Failed to send SMS reminder',
          'SMS_SEND_FAILED'
        ),
        { status: 500 }
      );
    }

    // Log successful SMS send
    await createAuditLog({
      userId: user.userId,
      action: 'SEND_SMS_REMINDER',
      entityType: 'Invoice',
      entityId: invoice.id,
      description: `Sent SMS reminder for invoice ${invoice.invoiceNumber} to ${invoice.customer.name}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer.name,
        customerPhone: invoice.customer.phone,
        balanceAmount: invoice.balanceAmount,
        daysOverdue,
        messageId: smsResult.messageId,
        provider: smsResult.provider,
        cost: smsResult.cost,
      },
    });

    return NextResponse.json(
      createSuccessResponse({
        message: 'SMS reminder sent successfully',
        sms: {
          messageId: smsResult.messageId,
          provider: smsResult.provider,
          cost: smsResult.cost,
        },
      })
    );
  } catch (error) {
    console.error('Error sending SMS reminder:', error);

    if (error instanceof NotFoundError || error instanceof ValidationError) {
      return NextResponse.json(
        createErrorResponse(error.message, error.code),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse(
        'Failed to send SMS reminder',
        'INTERNAL_ERROR'
      ),
      { status: 500 }
    );
  }
}
