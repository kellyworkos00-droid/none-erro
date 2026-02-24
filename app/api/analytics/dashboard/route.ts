import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  generateAgingReport,
  generateCashFlowForecast,
  getDashboardMetrics,
  calculateFinancialRatios,
} from '@/lib/analytics-service';
import { errorResponse, successResponse } from '@/lib/response';

/**
 * GET /api/analytics/dashboard
 * Get comprehensive dashboard metrics
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

    const metrics = await getDashboardMetrics();

    return successResponse({
      data: {
        revenue: metrics.totalRevenue.toNumber(),
        expenses: metrics.totalExpenses.toNumber(),
        netIncome: metrics.netIncome.toNumber(),
        assets: metrics.totalAssets.toNumber(),
        liabilities: metrics.totalLiabilities.toNumber(),
        equity: metrics.totalEquity.toNumber(),
        cash: metrics.cashOnHand.toNumber(),
        accountsReceivable: metrics.accountsReceivable.toNumber(),
        accountsPayable: metrics.accountsPayable.toNumber(),
        outstandingInvoices: metrics.outstandingInvoices,
        overdueInvoices: metrics.overdueInvoices,
        ratios: {
          debtToEquity: metrics.metrics.debtToEquity,
          currentRatio: metrics.metrics.currentRatio,
          quickRatio: metrics.metrics.quickRatio,
          profitMargin: metrics.metrics.profitMargin,
          returnOnAssets: metrics.metrics.returnOnAssets,
          returnOnEquity: metrics.metrics.returnOnEquity,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return errorResponse('Failed to fetch dashboard metrics', 500);
  }
}
