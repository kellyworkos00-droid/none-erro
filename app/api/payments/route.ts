/**
 * API Route: /api/payments
 * Payment recording endpoint with multiple payment methods
 */

import { NextRequest, NextResponse } from 'next/server';
import { POST, GET, getPaymentHistoryHandler, recordBulkPaymentsHandler, recordRefundHandler } from './handlers';

export const dynamic = 'force-dynamic';

// Re-export handlers
export { POST, GET };

/**
 * Route pattern:
 * POST /api/payments - Record single payment
 * GET /api/payments - Get available payment methods
 * GET /api/payments/history/[invoiceId] - Get payment history
 * POST /api/payments/bulk - Record multiple payments
 * POST /api/payments/refund - Record refund
 */

// Handle dynamic routes
export async function getPaymentHistory(
  request: NextRequest,
  { params }: { params: { segments?: string[] } }
) {
  const segments = params.segments || [];

  if (segments[0] === 'history' && segments[1]) {
    return getPaymentHistoryHandler(request, segments[1]);
  }

  if (segments[0] === 'bulk') {
    return recordBulkPaymentsHandler(request);
  }

  if (segments[0] === 'refund') {
    return recordRefundHandler(request);
  }

  return new NextResponse('Not found', { status: 404 });
}
