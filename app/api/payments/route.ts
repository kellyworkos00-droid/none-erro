/**
 * API Route: /api/payments
 * Payment recording endpoint with multiple payment methods
 */

import { POST, GET } from './handlers';

export const dynamic = 'force-dynamic';

// Re-export valid HTTP method handlers
export { POST, GET };

/**
 * Route pattern:
 * POST /api/payments - Record single payment
 * GET /api/payments - Get available payment methods
 * 
 * Additional routes:
 * GET /api/payments/history/[invoiceId] - Get payment history
 * POST /api/payments/bulk - Record multiple payments
 * POST /api/payments/refund - Record refund
 */
