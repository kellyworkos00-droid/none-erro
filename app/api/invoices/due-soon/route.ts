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

    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch invoices due within 7 days (including overdue)
    const invoicesDueSoon = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        dueDate: { lte: in7Days },
        balanceAmount: { gt: 0 } // Only unpaid amounts
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true }
        }
      },
      orderBy: [
        { dueDate: 'asc' }, // Soonest first
        { balanceAmount: 'desc' } // Then largest amounts
      ],
      take: 20
    });

    // Calculate days until due for each invoice
    const invoicesWithDays = invoicesDueSoon.map(invoice => {
      const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const isOverdue = daysUntilDue < 0;
      
      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customer: invoice.customer,
        totalAmount: invoice.totalAmount,
        balanceAmount: invoice.balanceAmount,
        paidAmount: invoice.paidAmount,
        dueDate: invoice.dueDate,
        daysUntilDue,
        isOverdue,
        status: invoice.status,
        priority: isOverdue ? 'urgent' : daysUntilDue <= 1 ? 'high' : daysUntilDue <= 3 ? 'medium' : 'normal'
      };
    });

    // Calculate summary
    const summary = {
      total: invoicesWithDays.length,
      overdue: invoicesWithDays.filter(i => i.isOverdue).length,
      dueSoon: invoicesWithDays.filter(i => !i.isOverdue && i.daysUntilDue <= 3).length,
      totalAmount: invoicesWithDays.reduce((sum, i) => sum + i.balanceAmount, 0),
      overdueAmount: invoicesWithDays
        .filter(i => i.isOverdue)
        .reduce((sum, i) => sum + i.balanceAmount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        invoices: invoicesWithDays
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching due invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch due invoices' },
      { status: 500 }
    );
  }
}
