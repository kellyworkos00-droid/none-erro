import { Workbook, Worksheet } from 'exceljs';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { AgingReport, CashFlowData, FinancialRatio, DashboardMetrics } from '@/lib/analytics-service';
import { Decimal } from 'decimal.js';

type AutoTableDrawData = {
  pageNumber: number;
};

type AutoTableOptions = {
  head: string[][];
  body: string[][];
  startY?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  didDrawPage?: (data: AutoTableDrawData) => void;
};

function getAutoTable(doc: jsPDF): (options: AutoTableOptions) => void {
  return (doc as unknown as { autoTable: (options: AutoTableOptions) => void }).autoTable;
}

/**
 * Export Service
 * Handles PDF and Excel export functionality with professional formatting
 */

// ============================================================================
// EXCEL EXPORTS
// ============================================================================

/**
 * Export aging report to Excel
 */
export async function exportAgingReportToExcel(
  agingReport: AgingReport,
  fileName: string = 'aging-report.xlsx'
): Promise<Buffer> {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Aging Report');

    // Title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Aging Report';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Report date
    worksheet.getCell('A2').value = `Report Date: ${agingReport.date.toLocaleDateString()}`;
    worksheet.getCell('A2').font = { size: 11 };

    // Headers
    const headers = ['Aging Range', 'Invoice Count', 'Total Amount', 'Percentage'];
    const headerRow = worksheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Data rows
    agingReport.invoices.forEach((bucket, rowIndex) => {
      const row = worksheet.getRow(5 + rowIndex);
      row.getCell(1).value = bucket.range;
      row.getCell(2).value = bucket.invoiceCount;
      row.getCell(3).value = bucket.totalAmount.toNumber();
      row.getCell(4).value = bucket.percentage / 100;

      // Format currency and percentage
      row.getCell(3).numFmt = '$#,##0.00';
      row.getCell(4).numFmt = '0.00%';
    });

    // Total row
    const totalRow = worksheet.getRow(5 + agingReport.invoices.length + 1);
    totalRow.getCell(1).value = 'TOTAL';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(2).value = agingReport.totalInvoices;
    totalRow.getCell(2).font = { bold: true };
    totalRow.getCell(3).value = agingReport.totalOutstanding.toNumber();
    totalRow.getCell(3).numFmt = '$#,##0.00';
    totalRow.getCell(3).font = { bold: true };
    totalRow.getCell(4).value = 1;
    totalRow.getCell(4).numFmt = '0.00%';
    totalRow.getCell(4).font = { bold: true };

    // Set column widths
    worksheet.columns = [
      { width: 20 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  } catch (error) {
    console.error('Error exporting aging report to Excel:', error);
    throw new Error('Failed to export aging report to Excel');
  }
}

/**
 * Export cash flow data to Excel
 */
export async function exportCashFlowToExcel(
  data: CashFlowData[],
  fileName: string = 'cash-flow.xlsx'
): Promise<Buffer> {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Cash Flow');

    // Title
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Cash Flow Forecast';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 30;

    // Headers
    const headers = ['Date', 'Inflows', 'Outflows', 'Net Flow', 'Cumulative Balance'];
    const headerRow = worksheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003366' } };
      cell.alignment = { horizontal: 'center' };
    });

    // Data rows
    data.forEach((cashFlow, rowIndex) => {
      const row = worksheet.getRow(4 + rowIndex);
      row.getCell(1).value = cashFlow.date;
      row.getCell(1).numFmt = 'yyyy-mm-dd';
      row.getCell(2).value = cashFlow.inflows.toNumber();
      row.getCell(2).numFmt = '$#,##0.00';
      row.getCell(3).value = cashFlow.outflows.toNumber();
      row.getCell(3).numFmt = '$#,##0.00';
      row.getCell(4).value = cashFlow.netFlow.toNumber();
      row.getCell(4).numFmt = '$#,##0.00';
      row.getCell(5).value = cashFlow.cumulativeBalance.toNumber();
      row.getCell(5).numFmt = '$#,##0.00';

      // Conditional formatting - highlight negative net flow
      if (cashFlow.netFlow.toNumber() < 0) {
        row.getCell(4).font = { color: { argb: 'FFFF0000' } };
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 20 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  } catch (error) {
    console.error('Error exporting cash flow to Excel:', error);
    throw new Error('Failed to export cash flow to Excel');
  }
}

/**
 * Export dashboard metrics to Excel
 */
export async function exportDashboardToExcel(
  metrics: DashboardMetrics,
  fileName: string = 'dashboard-metrics.xlsx'
): Promise<Buffer> {
  try {
    const workbook = new Workbook();

    // Financial Summary Sheet
    const summarySheet = workbook.addWorksheet('Financial Summary');
    createFinancialSummarySheet(summarySheet, metrics);

    // Ratios Sheet
    const ratiosSheet = workbook.addWorksheet('Financial Ratios');
    createRatiosSheet(ratiosSheet, metrics.metrics);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as ArrayBuffer);
  } catch (error) {
    console.error('Error exporting dashboard to Excel:', error);
    throw new Error('Failed to export dashboard to Excel');
  }
}

function createFinancialSummarySheet(worksheet: Worksheet, metrics: DashboardMetrics) {
  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Financial Summary';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
  titleCell.alignment = { horizontal: 'center' };
  worksheet.getRow(1).height = 25;

  const data = [
    ['Total Revenue', metrics.totalRevenue.toNumber()],
    ['Total Expenses', metrics.totalExpenses.toNumber()],
    ['Net Income', metrics.netIncome.toNumber()],
    ['Total Assets', metrics.totalAssets.toNumber()],
    ['Total Liabilities', metrics.totalLiabilities.toNumber()],
    ['Total Equity', metrics.totalEquity.toNumber()],
    ['Cash on Hand', metrics.cashOnHand.toNumber()],
    ['Accounts Receivable', metrics.accountsReceivable.toNumber()],
    ['Accounts Payable', metrics.accountsPayable.toNumber()],
    ['Outstanding Invoices', metrics.outstandingInvoices],
    ['Overdue Invoices', metrics.overdueInvoices],
  ];

  data.forEach((row, index) => {
    const dataRow = worksheet.getRow(3 + index);
    dataRow.getCell(1).value = row[0];
    dataRow.getCell(1).font = { bold: true };
    dataRow.getCell(2).value = row[1];

    // Format as currency for monetary values
    if (index < 9) {
      dataRow.getCell(2).numFmt = '$#,##0.00';
    }
  });

  worksheet.columns = [{ width: 25 }, { width: 20 }];
}

function createRatiosSheet(worksheet: Worksheet, ratio: FinancialRatio) {
  // Title
  worksheet.mergeCells('A1:B1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'Financial Ratios';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
  titleCell.alignment = { horizontal: 'center' };
  worksheet.getRow(1).height = 25;

  const ratios = [
    ['Debt-to-Equity Ratio', ratio.debtToEquity],
    ['Current Ratio', ratio.currentRatio],
    ['Quick Ratio', ratio.quickRatio],
    ['Debt-to-Assets Ratio', ratio.debtToAssets],
    ['Asset Turnover', ratio.assetTurnover],
    ['Return on Assets (ROA)', ratio.returnOnAssets],
    ['Return on Equity (ROE)', ratio.returnOnEquity],
    ['Profit Margin', ratio.profitMargin],
  ];

  ratios.forEach((item, index) => {
    const row = worksheet.getRow(3 + index);
    row.getCell(1).value = item[0];
    row.getCell(1).font = { bold: true };
    row.getCell(2).value = item[1];
    row.getCell(2).numFmt = '0.00%';
  });

  worksheet.columns = [{ width: 25 }, { width: 20 }];
}

// ============================================================================
// PDF EXPORTS
// ============================================================================

/**
 * Export aging report to PDF
 */
export async function exportAgingReportToPDF(
  agingReport: AgingReport,
  fileName: string = 'aging-report.pdf'
): Promise<Buffer> {
  try {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text('Aging Report', 14, 22);

    // Report date
    doc.setFontSize(10);
    doc.text(`Report Date: ${agingReport.date.toLocaleDateString()}`, 14, 32);

    // Table data
    const tableData = agingReport.invoices.map((bucket) => [
      bucket.range,
      bucket.invoiceCount.toString(),
      `$${bucket.totalAmount.toFixed(2)}`,
      `${bucket.percentage.toFixed(2)}%`,
    ]);

    // Add totals row
    tableData.push([
      'TOTAL',
      agingReport.totalInvoices.toString(),
      `$${agingReport.totalOutstanding.toFixed(2)}`,
      '100.00%',
    ]);

    getAutoTable(doc)({
      head: [['Aging Range', 'Invoice Count', 'Total Amount', 'Percentage']],
      body: tableData,
      startY: 40,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      didDrawPage: (data: AutoTableDrawData) => {
        // Footer
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
    });

    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Error exporting aging report to PDF:', error);
    throw new Error('Failed to export aging report to PDF');
  }
}

/**
 * Export cash flow to PDF
 */
export async function exportCashFlowToPDF(
  data: CashFlowData[],
  fileName: string = 'cash-flow.pdf'
): Promise<Buffer> {
  try {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(16);
    doc.text('Cash Flow Forecast', 14, 22);

    // Summary
    doc.setFontSize(10);
    const startDate = data[0]?.date.toLocaleDateString() || '';
    const endDate = data[data.length - 1]?.date.toLocaleDateString() || '';
    doc.text(`Period: ${startDate} to ${endDate}`, 14, 32);

    // Table data
    const tableData = data.map((cf) => [
      cf.date.toLocaleDateString(),
      `$${cf.inflows.toFixed(2)}`,
      `$${cf.outflows.toFixed(2)}`,
      `$${cf.netFlow.toFixed(2)}`,
      `$${cf.cumulativeBalance.toFixed(2)}`,
    ]);

    getAutoTable(doc)({
      head: [['Date', 'Inflows', 'Outflows', 'Net Flow', 'Cumulative Balance']],
      body: tableData,
      startY: 42,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
      didDrawPage: (data: AutoTableDrawData) => {
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      },
    });

    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Error exporting cash flow to PDF:', error);
    throw new Error('Failed to export cash flow to PDF');
  }
}

/**
 * Export dashboard metrics to PDF
 */
export async function exportDashboardToPDF(
  metrics: DashboardMetrics,
  fileName: string = 'dashboard-metrics.pdf'
): Promise<Buffer> {
  try {
    const doc = new jsPDF();

    // Page 1: Financial Summary
    doc.setFontSize(16);
    doc.text('Financial Dashboard', 14, 22);

    doc.setFontSize(12);
    doc.text('Financial Summary', 14, 35);

    const financialData = [
      ['Total Revenue', `$${metrics.totalRevenue.toFixed(2)}`],
      ['Total Expenses', `$${metrics.totalExpenses.toFixed(2)}`],
      ['Net Income', `$${metrics.netIncome.toFixed(2)}`],
      ['Total Assets', `$${metrics.totalAssets.toFixed(2)}`],
      ['Total Liabilities', `$${metrics.totalLiabilities.toFixed(2)}`],
      ['Total Equity', `$${metrics.totalEquity.toFixed(2)}`],
      ['Cash on Hand', `$${metrics.cashOnHand.toFixed(2)}`],
      ['Accounts Receivable', `$${metrics.accountsReceivable.toFixed(2)}`],
      ['Accounts Payable', `$${metrics.accountsPayable.toFixed(2)}`],
    ];

    getAutoTable(doc)({
      head: [['Metric', 'Amount']],
      body: financialData,
      startY: 42,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    });

    // Page 2: Financial Ratios
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Financial Ratios', 14, 22);

    const ratioData = [
      ['Debt-to-Equity Ratio', (metrics.metrics.debtToEquity * 100).toFixed(2) + '%'],
      ['Current Ratio', (metrics.metrics.currentRatio * 100).toFixed(2) + '%'],
      ['Quick Ratio', (metrics.metrics.quickRatio * 100).toFixed(2) + '%'],
      ['Debt-to-Assets Ratio', (metrics.metrics.debtToAssets * 100).toFixed(2) + '%'],
      ['Asset Turnover', (metrics.metrics.assetTurnover * 100).toFixed(2) + '%'],
      ['Return on Assets', (metrics.metrics.returnOnAssets * 100).toFixed(2) + '%'],
      ['Return on Equity', (metrics.metrics.returnOnEquity * 100).toFixed(2) + '%'],
      ['Profit Margin', (metrics.metrics.profitMargin * 100).toFixed(2) + '%'],
    ];

    getAutoTable(doc)({
      head: [['Ratio', 'Value']],
      body: ratioData,
      startY: 35,
      margin: { top: 10, right: 10, bottom: 10, left: 10 },
    });

    return Buffer.from(doc.output('arraybuffer'));
  } catch (error) {
    console.error('Error exporting dashboard to PDF:', error);
    throw new Error('Failed to export dashboard to PDF');
  }
}

/**
 * Generic export function that routes to appropriate format
 */
export async function exportReport(
  format: 'pdf' | 'xlsx',
  reportType: 'aging' | 'cashflow' | 'dashboard',
  data: AgingReport | CashFlowData[] | DashboardMetrics
): Promise<Buffer> {
  try {
    switch (reportType) {
      case 'aging': {
        const agingData = data as AgingReport;
        return format === 'pdf'
          ? await exportAgingReportToPDF(agingData)
          : await exportAgingReportToExcel(agingData);
      }
      case 'cashflow': {
        const cashflowData = data as CashFlowData[];
        return format === 'pdf'
          ? await exportCashFlowToPDF(cashflowData)
          : await exportCashFlowToExcel(cashflowData);
      }
      case 'dashboard': {
        const dashboardData = data as DashboardMetrics;
        return format === 'pdf'
          ? await exportDashboardToPDF(dashboardData)
          : await exportDashboardToExcel(dashboardData);
      }
      default:
        throw new Error('Unknown report type');
    }
  } catch (error) {
    console.error(`Error exporting ${reportType} report as ${format}:`, error);
    throw error;
  }
}
