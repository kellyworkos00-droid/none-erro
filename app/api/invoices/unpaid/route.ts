import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'all';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query unpaid invoices from database
    const invoices = await prisma.invoice.findMany({
      where: {
        balanceAmount: {
          gt: 0, // Balance greater than 0
        },
        status: {
          not: 'PAID',
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Calculate status and days overdue
    const unpaidInvoices = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let invoiceStatus = 'pending';
      if (daysOverdue > 0) {
        invoiceStatus = 'overdue';
      } else if (daysOverdue >= -3) {
        invoiceStatus = 'warning';
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: {
          id: invoice.customer.id,
          name: invoice.customer.name,
          email: invoice.customer.email,
          phone: invoice.customer.phone,
        },
        amount: invoice.balanceAmount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        dueDate: invoice.dueDate.toISOString().split('T')[0],
        issueDate: invoice.issueDate.toISOString().split('T')[0],
        daysOverdue: Math.max(0, daysOverdue),
        status: invoiceStatus,
        notes: invoice.notes || '',
      };
    });

    // Filter by status
    let filteredInvoices = unpaidInvoices;
    if (status === 'overdue') {
      filteredInvoices = unpaidInvoices.filter(inv => inv.status === 'overdue');
    } else if (status === 'pending') {
      filteredInvoices = unpaidInvoices.filter(inv => inv.status === 'pending');
    } else if (status === 'warning') {
      filteredInvoices = unpaidInvoices.filter(inv => inv.status === 'warning');
    }

    // Calculate total
    const total = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);

    return NextResponse.json({
      success: true,
      data: filteredInvoices,
      total,
      count: filteredInvoices.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Unpaid invoices error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unpaid invoices' },
      { status: 500 }
    );
  }
}
