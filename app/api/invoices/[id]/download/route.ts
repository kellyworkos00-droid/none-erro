import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import type { Payment } from '@prisma/client';

/**
 * GET /api/invoices/:id/download
 * Download invoice as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePermission(request, 'invoice.view');

    const invoiceId = params.id;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        payments: {
          where: { status: 'CONFIRMED' },
          orderBy: { paymentDate: 'desc' },
        },
        posOrders: {
          include: {
            orderItems: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Generate simple HTML table as PDF content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${invoice.invoiceNumber}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            color: #333;
          }
          .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #1f2937;
            padding-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            color: #1f2937;
          }
          .invoice-number {
            font-size: 14px;
            color: #666;
          }
          .details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
          }
          .section {
            margin-bottom: 20px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: #1f2937;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #f3f4f6;
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #d1d5db;
            font-weight: bold;
          }
          td {
            padding: 10px;
            border-bottom: 1px solid #e5e7eb;
          }
          .summary {
            margin-top: 30px;
            border-top: 2px solid #1f2937;
            padding-top: 20px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
          }
          .summary-total {
            font-weight: bold;
            font-size: 16px;
            color: #1f2937;
          }
          .stamp {
            color: #999;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${invoice.invoiceNumber}</h1>
          <div class="invoice-number">Invoice</div>
        </div>

        <div class="details">
          <div>
            <div class="section-title">Customer</div>
            <p>${invoice.customer?.name || 'N/A'}</p>
            ${invoice.customer?.email ? `<p>${invoice.customer.email}</p>` : ''}
            ${invoice.customer?.phone ? `<p>${invoice.customer.phone}</p>` : ''}
          </div>
          <div>
            <div class="section">
              <div class="section-title">Issue Date</div>
              <p>${new Date(invoice.issueDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="section">
              <div class="section-title">Due Date</div>
              <p>${new Date(invoice.dueDate).toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Invoice Details</div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: center;">Quantity</th>
                <th style="text-align: right;">Unit Price (KES)</th>
                <th style="text-align: right;">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              ${
                invoice.posOrders && invoice.posOrders.length > 0
                  ? invoice.posOrders
                      .flatMap((order) => order.orderItems)
                      .map(
                        (item) => `
                  <tr>
                    <td>${item.product?.name || item.product?.code || 'Product'}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${item.unitPrice.toFixed(2)}</td>
                    <td style="text-align: right;">${item.totalPrice.toFixed(2)}</td>
                  </tr>
                `
                      )
                      .join('')
                  : '<tr><td colspan="4" style="text-align: center; color: #999;">No items</td></tr>'
              }
              <tr style="border-top: 2px solid #1f2937; font-weight: bold;">
                <td colspan="3" style="text-align: right;">Subtotal:</td>
                <td style="text-align: right;">${(invoice.subtotal || invoice.totalAmount).toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold;">
                <td colspan="3" style="text-align: right;">Tax:</td>
                <td style="text-align: right;">${(invoice.taxAmount || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="summary">
          <div class="summary-row">
            <span>Total Amount:</span>
            <span class="summary-total">${invoice.totalAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Paid Amount:</span>
            <span>${invoice.paidAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row" style="border-top: 1px solid #d1d5db; padding-top: 10px; margin-top: 10px;">
            <span>Balance Due:</span>
            <span class="summary-total">${invoice.balanceAmount.toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Status:</span>
            <span>${invoice.status}</span>
          </div>
        </div>

        ${
          invoice.payments && invoice.payments.length > 0
            ? `
          <div class="section">
            <div class="section-title">Payment History</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th style="text-align: right;">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.payments
                  .map(
                    (payment: Payment) => `
                  <tr>
                    <td>${new Date(payment.paymentDate).toLocaleDateString('en-KE')}</td>
                    <td>${payment.paymentMethod}</td>
                    <td style="text-align: right;">${payment.amount.toFixed(2)}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
            `
            : ''
        }

        <div class="stamp">
          <p>Generated on ${new Date().toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </body>
      </html>
    `;

    // Return HTML content as attachment (browser will prompt to save/open)
    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error('Download invoice error:', error);
    return NextResponse.json(
      { error: 'Failed to download invoice' },
      { status: 500 }
    );
  }
}
