import { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { generateCashFlowForecast } from '@/lib/analytics-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/analytics/cash-flow
 * Get cash flow forecast for a specified period
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
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return errorResponse('Missing startDate or endDate parameter', 400);
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return errorResponse('Invalid date format', 400);
    }

    if (startDate >= endDate) {
      return errorResponse('startDate must be before endDate', 400);
    }

    const cashFlow = await generateCashFlowForecast(startDate, endDate);

    return successResponse({
      data: {
        period: {
          start: startDate,
          end: endDate,
        },
        forecasts: cashFlow.map((cf) => ({
          date: cf.date,
          inflows: cf.inflows.toNumber(),
          outflows: cf.outflows.toNumber(),
          netFlow: cf.netFlow.toNumber(),
          cumulativeBalance: cf.cumulativeBalance.toNumber(),
        })),
      },
    });
  } catch (error) {
    console.error('Error generating cash flow forecast:', error);
    return errorResponse('Failed to generate cash flow forecast', 500);
  }
}
