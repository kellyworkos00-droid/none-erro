import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          include: {
            payments: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();
    const balances = customers.map((customer) => {
      const invoiceData = customer.invoices.map((invoice) => {
        const paidAmount = invoice.payments.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );
        const balance = invoice.totalAmount - paidAmount;
        const daysOverdue = Math.floor(
          (now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        );

        return { balance, daysOverdue };
      });

      const totalInvoiced = customer.invoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0
      );

      const totalPaid = customer.invoices.reduce((sum, inv) => {
        const paid = inv.payments.reduce((pSum, p) => pSum + p.amount, 0);
        return sum + paid;
      }, 0);

      const totalBalance = totalInvoiced - totalPaid;

      let current = 0;
      let days30 = 0;
      let days60 = 0;
      let days90 = 0;
      let days90Plus = 0;

      invoiceData.forEach(({ balance, daysOverdue }) => {
        if (balance <= 0) return;

        if (daysOverdue <= 0) {
          current += balance;
        } else if (daysOverdue <= 30) {
          days30 += balance;
        } else if (daysOverdue <= 60) {
          days60 += balance;
        } else if (daysOverdue <= 90) {
          days90 += balance;
        } else {
          days90Plus += balance;
        }
      });

      return {
        id: customer.id,
        customerCode: customer.customerCode,
        customerName: customer.name,
        email: customer.email,
        phone: customer.phone,
        totalInvoiced,
        totalPaid,
        totalBalance,
        current,
        days30,
        days60,
        days90,
        days90Plus,
      };
    });

    return NextResponse.json({ data: balances });
  } catch (error) {
    console.error('Error fetching customer balances:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer balances' },
      { status: 500 }
    );
  }
}
