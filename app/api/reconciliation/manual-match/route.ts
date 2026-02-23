import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { manualMatchSchema } from '@/lib/validations';
import { reconcileTransaction } from '@/lib/matching-engine';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * POST /api/reconciliation/manual-match
 * Manually match a bank transaction to a customer/invoice
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'reconciliation.match');

    const body = await request.json();

    // Validate input
    const validation = manualMatchSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        createErrorResponse('Invalid input', 'VALIDATION_ERROR', validation.error.errors),
        { status: 400 }
      );
    }

    const { bankTransactionId, customerId, invoiceId, amount, notes } = validation.data;

    // Reconcile transaction
    const payment = await reconcileTransaction(
      bankTransactionId,
      customerId,
      invoiceId,
      user.userId,
      notes
    );

    // Create audit log
    await createAuditLog({
      userId: user.userId,
      action: 'RECONCILE_PAYMENT',
      entityType: 'Payment',
      entityId: payment.id,
      description: `Manually matched bank transaction to customer`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: {
        bankTransactionId,
        customerId,
        invoiceId,
        amount,
      },
    });

    return NextResponse.json(
      createSuccessResponse(payment, 'Transaction successfully reconciled'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Manual match error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        createErrorResponse(error.message, 'RECONCILIATION_ERROR'),
        { status: 400 }
      );
    }

    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
