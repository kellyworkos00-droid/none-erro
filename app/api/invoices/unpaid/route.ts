import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'all';

    // Mock unpaid invoices data
    const allInvoices = [
      {
        id: '1',
        invoiceNumber: 'INV-2026-001',
        customer: {
          id: 'cust1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+254712345678',
          companyName: 'ABC Trading Co',
        },
        amount: 450000,
        dueDate: '2026-02-10',
        issueDate: '2026-02-01',
        daysOverdue: 7,
        status: 'overdue',
        notes: 'First overdue reminder sent',
      },
      {
        id: '2',
        invoiceNumber: 'INV-2026-002',
        customer: {
          id: 'cust2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+254798765432',
          companyName: 'XYZ Enterprises',
        },
        amount: 750000,
        dueDate: '2026-02-05',
        issueDate: '2026-01-20',
        daysOverdue: 12,
        status: 'overdue',
        notes: 'Second reminder required',
      },
      {
        id: '3',
        invoiceNumber: 'INV-2026-003',
        customer: {
          id: 'cust3',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+254711223344',
          companyName: 'Tech Solutions Ltd',
        },
        amount: 525000,
        dueDate: '2026-02-20',
        issueDate: '2026-02-05',
        daysOverdue: 0,
        status: 'warning',
        notes: 'Due in 3 days',
      },
      {
        id: '4',
        invoiceNumber: 'INV-2026-004',
        customer: {
          id: 'cust4',
          name: 'Sarah Williams',
          email: 'sarah@example.com',
          phone: '+254755667788',
          companyName: 'Global Import/Export',
        },
        amount: 1200000,
        dueDate: '2026-03-01',
        issueDate: '2026-02-10',
        daysOverdue: 0,
        status: 'pending',
        notes: 'Standard payment terms',
      },
      {
        id: '5',
        invoiceNumber: 'INV-2026-005',
        customer: {
          id: 'cust5',
          name: 'David Brown',
          email: 'david@example.com',
          phone: '+254799112233',
          companyName: 'Brown Industries',
        },
        amount: 890000,
        dueDate: '2026-02-15',
        issueDate: '2026-02-01',
        daysOverdue: 2,
        status: 'overdue',
        notes: 'Payment arrangement pending',
      },
      {
        id: '6',
        invoiceNumber: 'INV-2026-006',
        customer: {
          id: 'cust6',
          name: 'Emily Davis',
          email: 'emily@example.com',
          phone: '+254712334455',
          companyName: 'Davis & Associates',
        },
        amount: 675000,
        dueDate: '2026-02-28',
        issueDate: '2026-02-14',
        daysOverdue: 0,
        status: 'pending',
        notes: 'New customer, standard terms',
      },
      {
        id: '7',
        invoiceNumber: 'INV-2026-007',
        customer: {
          id: 'cust7',
          name: 'Robert Miller',
          email: 'robert@example.com',
          phone: '+254798776655',
          companyName: 'Miller Manufacturing',
        },
        amount: 2100000,
        dueDate: '2026-02-08',
        issueDate: '2026-01-25',
        daysOverdue: 9,
        status: 'overdue',
        notes: 'Large invoice, follow up required',
      },
      {
        id: '8',
        invoiceNumber: 'INV-2026-008',
        customer: {
          id: 'cust8',
          name: 'Lisa Taylor',
          email: 'lisa@example.com',
          phone: '+254755443322',
          companyName: 'Taylor Consulting',
        },
        amount: 425000,
        dueDate: '2026-02-18',
        issueDate: '2026-02-05',
        daysOverdue: 0,
        status: 'warning',
        notes: 'Due in 1 day',
      },
    ];

    // Filter by status
    let filteredInvoices = allInvoices;
    if (status === 'overdue') {
      filteredInvoices = allInvoices.filter(inv => inv.status === 'overdue');
    } else if (status === 'pending') {
      filteredInvoices = allInvoices.filter(inv => inv.status === 'pending');
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
