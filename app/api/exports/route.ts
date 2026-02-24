import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  generateAgingReport,
  generateCashFlowForecast,
  getDashboardMetrics,
} from '@/lib/analytics-service';
import {
  exportAgingReportToPDF,
  exportAgingReportToExcel,
  exportCashFlowToPDF,
  exportCashFlowToExcel,
  exportDashboardToPDF,
  exportDashboardToExcel,
} from '@/lib/export-service';
import { errorResponse } from '@/lib/response';

/**
 * GET /api/exports
 * Export reports in PDF or Excel format
 *
 * Query parameters:
 * - type: aging | cashflow | dashboard
 * - format: pdf | xlsx
 * - startDate: (for cashflow)
 * - endDate: (for cashflow)
 * - asOfDate: (for aging)
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
    const reportType = searchParams.get('type') as string;
    const format = searchParams.get('format') as 'pdf' | 'xlsx' || 'pdf';

    if (!reportType || !['aging', 'cashflow', 'dashboard'].includes(reportType)) {
      return errorResponse('Invalid or missing report type', 400);
    }

    if (!['pdf', 'xlsx'].includes(format)) {
      return errorResponse('Invalid format. Must be pdf or xlsx', 400);
    }

    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;

    try {
      if (reportType === 'aging') {
        const asOfDateStr = searchParams.get('asOfDate');
        const asOfDate = asOfDateStr ? new Date(asOfDateStr) : new Date();

        if (isNaN(asOfDate.getTime())) {
          return errorResponse('Invalid asOfDate format', 400);
        }

        const report = await generateAgingReport(asOfDate);
        fileName = `aging-report-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        buffer =
          format === 'pdf' ? await exportAgingReportToPDF(report) : await exportAgingReportToExcel(report);
      } else if (reportType === 'cashflow') {
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');

        if (!startDateStr || !endDateStr) {
          return errorResponse('Missing startDate or endDate for cashflow report', 400);
        }

        const startDate = new Date(startDateStr);
        const endDate = new Date(endDateStr);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return errorResponse('Invalid date format', 400);
        }

        if (startDate >= endDate) {
          return errorResponse('startDate must be before endDate', 400);
        }

        const cashflow = await generateCashFlowForecast(startDate, endDate);
        fileName = `cashflow-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        buffer =
          format === 'pdf' ? await exportCashFlowToPDF(cashflow) : await exportCashFlowToExcel(cashflow);
      } else if (reportType === 'dashboard') {
        const metrics = await getDashboardMetrics();
        fileName = `dashboard-${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
        mimeType = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

        buffer =
          format === 'pdf' ? await exportDashboardToPDF(metrics) : await exportDashboardToExcel(metrics);
      } else {
        return errorResponse('Unknown report type', 400);
      }

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': buffer.length.toString(),
        },
      });
    } catch (exportError) {
      console.error('Export error:', exportError);
      return errorResponse('Failed to generate export', 500);
    }
  } catch (error) {
    console.error('Error processing export request:', error);
    return errorResponse('Failed to process export request', 500);
  }
}
