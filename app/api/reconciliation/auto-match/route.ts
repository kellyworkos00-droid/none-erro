import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';
import { autoReconcileAll } from '@/lib/matching-engine';
import { createAuditLog, getClientIp, getUserAgent } from '@/lib/audit';

/**
 * POST /api/reconciliation/auto-match
 * Trigger automatic reconciliation for all pending transactions
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requirePermission(request, 'reconciliation.match');

    // Run auto-reconciliation
    const results = await autoReconcileAll(user.userId);

    // Create audit log
    await createAuditLog({
      userId: user.userId,
      action: 'RECONCILE_PAYMENT',
      description: `Auto-reconciliation completed: ${results.matched} matched, ${results.unmatched} unmatched`,
      ipAddress: getClientIp(request.headers),
      userAgent: getUserAgent(request.headers),
      metadata: results,
    });

    return NextResponse.json(
      createSuccessResponse(results, 'Auto-reconciliation completed'),
      { status: 200 }
    );
  } catch (error) {
    console.error('Auto-match error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
