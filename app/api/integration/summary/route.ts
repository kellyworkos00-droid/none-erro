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
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Fetch real-time data from all modules
    const [
      // Invoices data
      totalInvoices,
      paidInvoices,
      unpaidInvoices,
      overdueInvoices,
      invoicesDueSoon,
      totalInvoicesAmount,
      paidInvoicesAmount,
      overdueInvoicesData,
      
      // Customer data
      totalCustomers,
      activeCustomers,
      
      // Product/Inventory data
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      productValues,
      totalWarehouses,
      
      // Supplier data
      totalSuppliers,
      totalSupplierBills,
      paidSupplierBills,
      unpaidSupplierBills,
      
      // Expenses data
      monthlyExpenses,
      
      // POS/Sales data
      monthlyPosOrders,
      
      // Audit logs
      auditLogsCount
    ] = await Promise.all([
      // Invoice queries
      prisma.invoice.count(),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: { in: ['DRAFT', 'SENT', 'OVERDUE', 'PARTIALLY_PAID'] } } }),
      prisma.invoice.count({ where: { status: 'OVERDUE' } }),
      prisma.invoice.count({
        where: {
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
          dueDate: { lte: in7Days, gte: now }
        }
      }),
      prisma.invoice.aggregate({ _sum: { totalAmount: true } }),
      prisma.invoice.aggregate({ where: { status: 'PAID' }, _sum: { totalAmount: true } }),
      prisma.invoice.findMany({
        where: { status: 'OVERDUE' },
        orderBy: { balanceAmount: 'desc' },
        take: 1,
        include: { customer: { select: { name: true } } }
      }),
      
      // Customer queries
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      
      // Product queries
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({
        where: {
          status: 'ACTIVE',
          quantity: { lt: prisma.product.fields.reorderLevel }
        }
      }),
      prisma.product.count({ where: { status: 'ACTIVE', quantity: 0 } }),
      prisma.product.findMany({
        where: { status: 'ACTIVE' },
        select: { cost: true, price: true, quantity: true }
      }),
      prisma.warehouse.count(),
      
      // Supplier queries
      prisma.supplier.count(),
      prisma.supplierBill.count(),
      prisma.supplierBill.count({ where: { status: 'PAID' } }),
      prisma.supplierBill.count({ where: { status: { in: ['PENDING', 'APPROVED'] } } }),
      
      // Expenses
      prisma.expense.aggregate({
        where: { expenseDate: { gte: startOfMonth } },
        _sum: { amount: true }
      }),
      
      // POS Orders
      prisma.posOrder.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true }
      }),
      
      // Audit logs
      prisma.auditLog.count()
    ]);

    // Calculate inventory value
    const totalInventoryValue = productValues.reduce((sum, p) => sum + ((p.cost || p.price) * p.quantity), 0);

    // Calculate financial metrics
    const totalRevenue = (totalInvoicesAmount._sum.totalAmount || 0);
    const realizedRevenue = (paidInvoicesAmount._sum.totalAmount || 0);
    const monthlyRevenue = (monthlyPosOrders._sum.totalAmount || 0);
    const expenses = (monthlyExpenses._sum.amount || 0);
    const monthlyProfit = monthlyRevenue - expenses;
    const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

    // Get top overdue invoice
    const topOverdueInvoice = overdueInvoicesData[0] || null;
    const daysOverdue = topOverdueInvoice 
      ? Math.floor((now.getTime() - new Date(topOverdueInvoice.dueDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Build alerts
    const alerts = [];
    if (overdueInvoices > 0 && topOverdueInvoice) {
      alerts.push({
        id: 1,
        type: 'overdue_invoice',
        severity: 'high',
        message: `${topOverdueInvoice.invoiceNumber} is ${daysOverdue} days overdue - KES ${(topOverdueInvoice.balanceAmount / 1000).toFixed(1)}K from ${topOverdueInvoice.customer.name}`,
        actionHref: '/dashboard/invoices/unpaid',
      });
    }
    if (lowStockProducts > 0) {
      alerts.push({
        id: 2,
        type: 'low_stock',
        severity: 'medium',
        message: `${lowStockProducts} items are running low on stock`,
        actionHref: '/dashboard/inventory',
      });
    }
    if (outOfStockProducts > 0) {
      alerts.push({
        id: 3,
        type: 'out_of_stock',
        severity: 'high',
        message: `${outOfStockProducts} items are out of stock`,
        actionHref: '/dashboard/stock-levels',
      });
    }
    if (unpaidSupplierBills > 0) {
      alerts.push({
        id: 4,
        type: 'supplier_payment',
        severity: 'medium',
        message: `${unpaidSupplierBills} supplier bills pending payment`,
        actionHref: '/dashboard/supplier-bills',
      });
    }

    const summary = {
      financialHealth: {
        monthlyRevenue: Math.round(monthlyRevenue),
        monthlyExpenses: Math.round(expenses),
        monthlyProfit: Math.round(monthlyProfit),
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        accountsReceivable: Math.round(totalRevenue - realizedRevenue),
        totalRevenue: Math.round(totalRevenue),
        realizedRevenue: Math.round(realizedRevenue),
      },
      unpaidInvoices: {
        total: unpaidInvoices,
        overdue: overdueInvoices,
        dueWithin7Days: invoicesDueSoon,
        topOverdueInvoice: topOverdueInvoice ? {
          invoiceNumber: topOverdueInvoice.invoiceNumber,
          customer: topOverdueInvoice.customer.name,
          amount: topOverdueInvoice.balanceAmount,
          daysOverdue
        } : null,
      },
      inventory: {
        totalItems: totalProducts,
        totalValue: Math.round(totalInventoryValue),
        lowStockItems: lowStockProducts,
        outOfStockItems: outOfStockProducts,
        warehouseCount: totalWarehouses,
      },
      sales: {
        invoicesSent: totalInvoices,
        invoicesPaid: paidInvoices,
        invoicesUnpaid: unpaidInvoices,
        estimatedRevenue: Math.round(totalRevenue),
        realizedRevenue: Math.round(realizedRevenue),
      },
      procurement: {
        supplierBillsReceived: totalSupplierBills,
        supplierBillsPaid: paidSupplierBills,
        supplierBillsUnpaid: unpaidSupplierBills,
        supplierCount: totalSuppliers,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
      compliance: {
        auditLogsCount,
        criticalAlerts: alerts.filter(a => a.severity === 'high').length,
        warnings: alerts.filter(a => a.severity === 'medium').length,
      },
      alerts,
      recommendations: [
        overdueInvoices > 0 && {
          id: 1,
          title: 'Improve Collections',
          description: `Focus on collecting ${overdueInvoices} overdue invoice(s).`,
          impact: 'Improve cash flow',
          module: 'Sales',
        },
        lowStockProducts > 0 && {
          id: 2,
          title: 'Optimize Inventory',
          description: `Reorder stock for ${lowStockProducts} items currently below minimum levels.`,
          impact: 'Prevent stockouts and maintain service levels',
          module: 'Inventory',
        },
        unpaidSupplierBills > 0 && {
          id: 3,
          title: 'Supplier Payments',
          description: `${unpaidSupplierBills} supplier bill(s) pending payment.`,
          impact: 'Maintain good supplier relationships',
          module: 'Procurement',
        },
      ].filter(Boolean),
    };

    return NextResponse.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Integration summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integration summary' },
      { status: 500 }
    );
  }
}
