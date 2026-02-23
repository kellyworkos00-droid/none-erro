import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/authorization';
import { createErrorResponse, createSuccessResponse } from '@/lib/utils';

/**
 * GET /api/transactions/recent
 * Get recent transactions across the entire system
 * Includes invoices, payments, supplier bills, and expenses
 */
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'invoice.view');

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    // Fetch recent invoices
    const invoices = await prisma.invoice.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    });

    // Fetch recent payments
    const payments = await prisma.payment.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, invoice: true },
    });

    // Fetch recent supplier bills
    const supplierBills = await prisma.supplierBill.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { supplier: true },
    });

    // Fetch recent expenses
    const expenses = await prisma.expense.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { createdByUser: true },
    });

    // Combine and sort all transactions by date
    const allTransactions = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(invoices as any[]).map((inv: any) => ({
        type: 'invoice' as const,
        id: inv.id,
        number: inv.invoiceNumber,
        amount: inv.totalAmount,
        status: inv.status,
        date: inv.createdAt,
        displayDate: inv.issueDate,
        entity: inv.customer?.name || 'Unknown',
        description: `Invoice from ${inv.customer?.name}`,
        details: {
          totalAmount: inv.totalAmount,
          paidAmount: inv.paidAmount,
          balanceAmount: inv.balanceAmount,
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(payments as any[]).map((pay: any) => ({
        type: 'payment' as const,
        id: pay.id,
        number: pay.paymentNumber,
        amount: pay.amount,
        status: 'CONFIRMED',
        date: pay.createdAt,
        displayDate: pay.paymentDate,
        entity: pay.customer?.name || 'Unknown',
        description: `Payment from ${pay.customer?.name} (${pay.paymentMethod})`,
        details: {
          invoiceNumber: pay.invoice?.invoiceNumber,
          paymentMethod: pay.paymentMethod,
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(supplierBills as any[]).map((bill: any) => ({
        type: 'supplier_bill' as const,
        id: bill.id,
        number: bill.billNumber,
        amount: bill.totalAmount,
        status: bill.status,
        date: bill.createdAt,
        displayDate: bill.issueDate,
        entity: bill.supplier?.name || 'Unknown',
        description: `Bill from ${bill.supplier?.name}`,
        details: {
          totalAmount: bill.totalAmount,
          paidAmount: bill.paidAmount,
          balanceAmount: bill.balanceAmount,
        },
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(expenses as any[]).map((exp: any) => ({
        type: 'expense' as const,
        id: exp.id,
        number: exp.expenseNumber,
        amount: exp.amount,
        status: 'RECORDED',
        date: exp.createdAt,
        displayDate: exp.expenseDate,
        entity: exp.category || 'Unknown',
        description: `${exp.description || 'Expense'} (${exp.category})`,
        details: {
          category: exp.category,
          createdBy: exp.createdByUser?.email,
        },
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(
      createSuccessResponse({
        transactions: allTransactions.slice(0, limit),
        summary: {
          totalInvoices: invoices.length,
          totalPayments: payments.length,
          totalBills: supplierBills.length,
          totalExpenses: expenses.length,
          combinedTotal: allTransactions.length,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Get recent transactions error:', error);
    return NextResponse.json(
      createErrorResponse('Internal server error', 'INTERNAL_ERROR'),
      { status: 500 }
    );
  }
}
