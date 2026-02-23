// @ts-nocheck
/**
 * API Route: POST /api/payments
 * Record payments with multiple methods
 */

import { NextRequest } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';
import { createApiResponse } from '@/lib/response';
import { ValidationError, ConflictError, NotFoundError } from '@/lib/errors';
import { recordPayment, recordBulkPayments, recordRefund, getPaymentHistory } from '@/lib/payment-service';
import { sanitizeHtml, checkForAttackPatterns } from '@/lib/security';
import { validatePaymentAmount, PaymentMethod, PAYMENT_METHOD_INFO } from '@/lib/payment-methods';
import { parseRequestBody, getValidationErrors } from '@/lib/validation';
import { logPayment, logValidation, logSecurity, LogLevel, trackApiCall } from '@/lib/logging';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

const paymentMethodSchema = z.enum([
  'BANK_TRANSFER',
  'MPESA',
  'BANK_CHEQUE',
  'CASH',
  'CASH_DEPOSIT',
  'CREDIT_CARD',
  'DEBIT_CARD',
  'PAYPAL',
  'STRIPE',
  'AIRTEL_MONEY',
  'PREPAID_VOUCHER',
  'STORE_CREDIT',
  'CRYPTOCURRENCY',
  'WIRE_TRANSFER',
  'OTHER',
]);

const recordPaymentSchema = z.object({
  invoiceId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: paymentMethodSchema,
  paymentDate: z.string().datetime().optional(),
  reference: z.string().optional(),
  notes: z.string().max(500).optional(),
  chequeNumber: z.string().optional(),
  bankCode: z.string().optional(),
  bankName: z.string().optional(),
  paymentGatewayId: z.string().optional(),
});

type RecordPaymentData = z.infer<typeof recordPaymentSchema>;

const bulkPaymentSchema = z.object({
  payments: z.array(
    z.object({
      invoiceId: z.string().cuid().optional(),
      customerId: z.string().cuid().optional(),
      amount: z.number().positive(),
    })
  ),
  paymentMethod: paymentMethodSchema,
  paymentDate: z.string().datetime().optional(),
  reference: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type BulkPaymentData = z.infer<typeof bulkPaymentSchema>;

/**
 * POST /api/payments/record
 * Record a single payment
 */
export async function POST(request: NextRequest) {
  const api = createApiResponse(request);
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const user = await requirePermission(request, 'invoice.collect');
    await logPayment('Payment recording initiated', LogLevel.INFO, {
      userId: user.userId,
      requestId,
    });

    const { success, data } = await parseRequestBody<RecordPaymentData>(request, recordPaymentSchema);

    if (!success || !data) {
      throw new ValidationError('Invalid payment data');
    }

    // Security: Check for attack patterns in notes
    if (data.notes) {
      const { safe, threat } = checkForAttackPatterns(data.notes);
      if (!safe) {
        await logSecurity(`Security threat detected in payment notes: ${threat}`, LogLevel.WARN, {
          userId: user.userId,
          requestId,
          ipAddress: getClientIp(request.headers),
          endpoint: '/api/payments',
          details: { threat, input: data.notes?.substring(0, 50) },
        });
        throw new ValidationError(`Security violation detected: ${threat}`);
      }
    }

    // Get invoice to validate
    if (data.invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: data.invoiceId },
      });

      if (!invoice) {
        await logPayment(`Invoice not found: ${data.invoiceId}`, LogLevel.WARN, {
          userId: user.userId,
          requestId,
          invoiceId: data.invoiceId,
        });
        throw new NotFoundError('Invoice');
      }

      // Validate payment amount
      const validation = validatePaymentAmount(
        data.amount,
        invoice.totalAmount,
        invoice.paidAmount,
        false
      );

      if (!validation.valid) {
        await logValidation('Payment amount validation failed', {
          userId: user.userId,
          requestId,
          field: 'amount',
          value: data.amount,
          rule: `amount must be <= ${invoice.balanceAmount}`,
        });
        throw new ValidationError(validation.error || 'Payment validation failed');
      }

      // Check if already paid
      if (invoice.status === 'PAID') {
        await logPayment(`Payment attempted on already paid invoice`, LogLevel.WARN, {
          userId: user.userId,
          requestId,
          invoiceId: data.invoiceId,
        });
        throw new ConflictError('Invoice is already fully paid');
      }
    }

    // Record payment using service
    const duration = Date.now() - startTime;
    const result = await recordPayment({
      userId: user.userId,
      invoiceId: data.invoiceId,
      customerId: data.customerId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      reference: data.reference,
      notes: data.notes ? sanitizeHtml(data.notes) : undefined,
      chequeNumber: data.chequeNumber,
      bankCode: data.bankCode,
      bankName: data.bankName,
      paymentGatewayId: data.paymentGatewayId,
    });

    if (!result.success) {
      await logPayment(`Payment recording failed: ${result.message}`, LogLevel.ERROR, {
        userId: user.userId,
        requestId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.paymentMethod,
        duration,
      });
      throw new ValidationError(result.message, { error: result.error });
    }

    await logPayment(`Payment recorded successfully`, LogLevel.INFO, {
      userId: user.userId,
      requestId,
      invoiceId: data.invoiceId,
      amount: data.amount,
      method: data.paymentMethod,
      status: result.invoiceStatus,
      duration,
    });

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'COLLECT_PAYMENT',
      entityType: 'Payment',
      entityId: result.paymentId,
      description: `Payment recorded: ${data.paymentMethod} - ${data.amount}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
    });

    // Track API metrics
    trackApiCall('/api/payments', 'POST', 201, Date.now() - startTime);

    return api.created(result, 'Payment recorded successfully');
  } catch (error) {
    // Track error
    const errorStatus = error instanceof ValidationError || error instanceof NotFoundError ? 400 : 
                       error instanceof ConflictError ? 409 : 500;
    trackApiCall('/api/payments', 'POST', errorStatus, Date.now() - startTime);

    if (error instanceof ValidationError || error instanceof ConflictError || error instanceof NotFoundError) {
      return api.error(error);
    }
    
    // Log unexpected errors
    await logPayment('Unexpected error in payment recording', LogLevel.CRITICAL, {
      error: error instanceof Error ? error : new Error(String(error)),
      duration: Date.now() - startTime,
    });
    
    throw error;
  }
}

/**
 * GET /api/payments/methods
 * Get available payment methods with details
 */
export async function GET(request: NextRequest) {
  const api = createApiResponse(request);
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const grouped = searchParams.get('grouped') === 'true';

    // Group payment methods by category
    const methods = Object.entries(PAYMENT_METHOD_INFO).map(([key, info]) => ({
      method: key,
      ...info,
    }));

    if (grouped) {
      const grouped: Record<string, typeof methods> = {};
      const categories: Record<string, string[]> = {
        'Bank Transfers': [
          PaymentMethod.BANK_TRANSFER,
          PaymentMethod.WIRE_TRANSFER,
        ],
        'Mobile Money': [
          PaymentMethod.MPESA,
          PaymentMethod.AIRTEL_MONEY,
        ],
        'Cheques': [PaymentMethod.BANK_CHEQUE],
        'Cash': [
          PaymentMethod.CASH,
          PaymentMethod.CASH_DEPOSIT,
        ],
        'Cards': [
          PaymentMethod.CREDIT_CARD,
          PaymentMethod.DEBIT_CARD,
        ],
        'Digital Wallets': [
          PaymentMethod.PAYPAL,
          PaymentMethod.STRIPE,
          PaymentMethod.CRYPTOCURRENCY,
        ],
        'Vouchers & Credits': [
          PaymentMethod.PREPAID_VOUCHER,
          PaymentMethod.STORE_CREDIT,
        ],
        'Other': [PaymentMethod.OTHER],
      };

      for (const [category, methodKeys] of Object.entries(categories)) {
        grouped[category] = methodKeys
          .map(key => methods.find(m => m.method === key))
          .filter(Boolean) as typeof methods;
      }

      trackApiCall('/api/payments', 'GET', 200, Date.now() - startTime);
      return api.success(grouped, 'Payment methods grouped by category');
    }

    trackApiCall('/api/payments', 'GET', 200, Date.now() - startTime);
    return api.success(methods, 'Available payment methods');
  } catch (error) {
    trackApiCall('/api/payments', 'GET', 500, Date.now() - startTime);
    throw error;
  }
}

/**
 * GET /api/payments/history/:invoiceId
 * Get payment history for an invoice
 */
export async function getPaymentHistoryHandler(request: NextRequest, invoiceId: string) {
  const api = createApiResponse(request);
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const user = await requirePermission(request, 'invoice.view');

    // Verify invoice exists
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      await logPayment(`Invoice not found: ${invoiceId}`, LogLevel.WARN, {
        userId: user.userId,
        requestId,
        invoiceId,
      });
      throw new NotFoundError('Invoice');
    }

    const payments = await getPaymentHistory(invoiceId);

    trackApiCall('/api/payments/history/:id', 'GET', 200, Date.now() - startTime);

    return api.success({
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.balanceAmount,
      payments,
    });
  } catch (error) {
    trackApiCall('/api/payments/history/:id', 'GET', 500, Date.now() - startTime);
    if (error instanceof NotFoundError) {
      return api.error(error);
    }
    throw error;
  }
}

/**
 * POST /api/payments/bulk
 * Record multiple payments at once
 */
export async function recordBulkPaymentsHandler(request: NextRequest) {
  const api = createApiResponse(request);
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const user = await requirePermission(request, 'invoice.collect');

    await logPayment(`Bulk payment processing initiated for ${request.body} items`, LogLevel.INFO, {
      userId: user.userId,
      requestId,
    });

    const { success, data, error } = await parseRequestBody<BulkPaymentData>(request, bulkPaymentSchema);

    if (!success || !data) {
      await logValidation('Bulk payment data validation failed', {
        userId: user.userId,
        requestId,
      });
      throw new ValidationError('Invalid bulk payment data', getValidationErrors(error!));
    }

    // Record bulk payments
    const results = await recordBulkPayments({
      userId: user.userId,
      payments: data.payments,
      paymentMethod: data.paymentMethod,
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      reference: data.reference,
      notes: data.notes,
    });

    // Audit log
    const successCount = results.filter(r => r.success).length;
    await createAuditLog({
      userId: user.userId,
      action: 'RECORD_BULK_PAYMENTS',
      description: `Bulk payments recorded: ${successCount}/${results.length} successful`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        totalPayments: results.length,
        successful: successCount,
        method: data.paymentMethod,
      },
    });

    await logPayment(`Bulk payment processing completed`, LogLevel.INFO, {
      userId: user.userId,
      requestId,
      duration: Date.now() - startTime,
    });

    trackApiCall('/api/payments/bulk', 'POST', 200, Date.now() - startTime);

    return api.success(
      {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: results.length - successCount,
        },
      },
      `Bulk payments processed: ${successCount} successful, ${results.length - successCount} failed`
    );
  } catch (error) {
    trackApiCall('/api/payments/bulk', 'POST', 500, Date.now() - startTime);
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}

/**
 * POST /api/payments/refund
 * Record a refund for a payment
 */
export async function recordRefundHandler(request: NextRequest) {
  const api = createApiResponse(request);
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    const user = await requirePermission(request, 'invoice.collect');

    await logPayment(`Refund processing initiated`, LogLevel.INFO, {
      userId: user.userId,
      requestId,
    });

    const refundSchema = z.object({
      paymentId: z.string().cuid(),
      reason: z.string().min(5).max(500),
    });

    type RefundData = z.infer<typeof refundSchema>;

    const { success, data, error } = await parseRequestBody<RefundData>(request, refundSchema);

    if (!success || !data) {
      await logValidation('Refund data validation failed', {
        userId: user.userId,
        requestId,
      });
      throw new ValidationError('Invalid refund data', getValidationErrors(error!));
    }

    const result = await recordRefund(user.userId, data.paymentId, data.reason);

    if (!result.success) {
      await logPayment(`Refund processing failed: ${result.message}`, LogLevel.ERROR, {
        userId: user.userId,
        requestId,
        duration: Date.now() - startTime,
      });
      throw new ValidationError(result.message);
    }

    // Audit log
    await createAuditLog({
      userId: user.userId,
      action: 'RECORD_REFUND',
      entityType: 'Payment',
      entityId: data.paymentId,
      description: `Refund recorded: ${data.reason}`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: { reason: data.reason },
    });

    await logPayment(`Refund processed successfully`, LogLevel.INFO, {
      userId: user.userId,
      requestId,
      duration: Date.now() - startTime,
    });

    trackApiCall('/api/payments/refund', 'POST', 201, Date.now() - startTime);

    return api.created(result, 'Refund recorded successfully');
  } catch (error) {
    trackApiCall('/api/payments/refund', 'POST', 500, Date.now() - startTime);
    if (error instanceof ValidationError) {
      return api.error(error);
    }
    throw error;
  }
}
