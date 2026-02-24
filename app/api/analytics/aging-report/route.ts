import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateAgingReport } from '@/lib/analytics-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/analytics/aging-report
 * Get aging report for outstanding invoices
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return errorResponse('Unauthorized', 401);
    }

    // Check authorization
    if (!['ADMIN', 'FINANCE_MANAGER'].includes(user.role || '')) {
      return errorResponse('Insufficient permissions', 403);
    }

    const { searchParams } = new URL(request.url);
    const asOfDateStr = searchParams.get('asOfDate');
    const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

    // Validate date
    if (isNaN(asOfDate.getTime())) {
      return errorResponse('Invalid asOfDate format', 400);
    }

    const report = await generateAgingReport(asOfDate);

    return successResponse({
      data: {
        date: report.date,
        totalOutstanding: report.totalOutstanding.toNumber(),
        totalInvoices: report.totalInvoices,
        buckets: report.invoices.map((bucket) => ({
          range: bucket.range,
          days: bucket.days,
          invoiceCount: bucket.invoiceCount,
          totalAmount: bucket.totalAmount.toNumber(),
          percentage: bucket.percentage,
        })),
      },
    });
  } catch (error) {
    console.error('Error generating aging report:', error);
    return errorResponse('Failed to generate aging report', 500);
  }
}
