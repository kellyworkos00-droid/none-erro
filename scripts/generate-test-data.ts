/**
 * Generate Sample Test Data
 * Creates realistic test invoices, customers, and payments
 */

import prisma from '../lib/prisma';

async function generateTestData() {
  try {
    console.log('🔄 Generating sample test data...\n');

    // Get first customer
    const customers = await prisma.customer.findMany({ take: 1 });
    if (customers.length === 0) {
      throw new Error('No customers found. Run customer setup first.');
    }

    const customerId = customers[0].id;

    // Get first user
    const users = await prisma.user.findMany({ take: 1 });
    if (users.length === 0) {
      throw new Error('No users found.');
    }

    const userId = users[0].id;

    console.log('📝 Creating test invoices...\n');

    // Create test invoices with different statuses
    const invoices = await Promise.all([
      // Unpaid invoice
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-001',
          customerId,
          issueDate: new Date('2026-02-01'),
          dueDate: new Date('2026-02-28'),
          subtotal: 50000,
          totalAmount: 50000,
          paidAmount: 0,
          balanceAmount: 50000,
          status: 'PENDING',
          notes: 'Test invoice - unpaid',
        },
      }),

      // Partially paid invoice
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-002',
          customerId,
          issueDate: new Date('2026-02-05'),
          dueDate: new Date('2026-03-05'),
          subtotal: 75000,
          totalAmount: 75000,
          paidAmount: 30000,
          balanceAmount: 45000,
          status: 'PARTIAL',
          notes: 'Test invoice - partially paid',
          lastPaymentDate: new Date('2026-02-15'),
          paymentCount: 1,
          partialPaymentCount: 1,
        },
      }),

      // Fully paid invoice
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-003',
          customerId,
          issueDate: new Date('2026-01-15'),
          dueDate: new Date('2026-02-15'),
          subtotal: 100000,
          totalAmount: 100000,
          paidAmount: 100000,
          balanceAmount: 0,
          status: 'PAID',
          notes: 'Test invoice - fully paid',
          paidDate: new Date('2026-02-10'),
          lastPaymentDate: new Date('2026-02-10'),
          paymentCount: 1,
          partialPaymentCount: 0,
        },
      }),

      // Overdue invoice
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-004',
          customerId,
          issueDate: new Date('2025-12-01'),
          dueDate: new Date('2026-01-01'),
          subtotal: 125000,
          totalAmount: 125000,
          paidAmount: 0,
          balanceAmount: 125000,
          status: 'OVERDUE',
          notes: 'Test invoice - overdue',
        },
      }),

      // Large invoice
      prisma.invoice.create({
        data: {
          invoiceNumber: 'INV-2026-005',
          customerId,
          issueDate: new Date('2026-02-10'),
          dueDate: new Date('2026-03-12'),
          subtotal: 500000,
          totalAmount: 500000,
          paidAmount: 0,
          balanceAmount: 500000,
          status: 'PENDING',
          notes: 'Test invoice - large amount',
        },
      }),
    ]);

    console.log(`✅ Created ${invoices.length} test invoices`);
    invoices.forEach((inv) => {
      console.log(`  - ${inv.invoiceNumber}: Ksh ${inv.totalAmount.toLocaleString()} (${inv.status})`);
    });

    // Create sample payments
    console.log('\n💳 Creating sample payments...\n');

    const payments = await Promise.all([
      prisma.payment.create({
        data: {
          invoiceId: invoices[1].id, // Partially paid invoice
          customerId,
          amount: 30000,
          paymentMethod: 'BANK_TRANSFER',
          paymentDate: new Date('2026-02-15'),
          reference: 'TXN-001',
          status: 'CONFIRMED',
        },
      }),

      prisma.payment.create({
        data: {
          invoiceId: invoices[2].id, // Fully paid invoice
          customerId,
          amount: 100000,
          paymentMethod: 'CHEQUE',
          paymentDate: new Date('2026-02-10'),
          reference: 'CHQ-12345',
          status: 'CONFIRMED',
        },
      }),
    ]);

    console.log(`✅ Created ${payments.length} sample payments`);
    payments.forEach((pmt) => {
      console.log(`  - Ksh ${pmt.amount.toLocaleString()} via ${pmt.paymentMethod}`);
    });

    // Update customer balance
    console.log('\n👥 Updating customer balances...\n');

    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalBalance = invoices.reduce((sum, invoice) => sum + invoice.balanceAmount, 0);

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        totalPayments: totalPaid,
        lastPaymentDate: new Date('2026-02-15'),
        averagePaymentAmount: totalPaid / payments.length,
      },
    });

    console.log(`✅ Customer balance updated`);
    console.log(`  - Total Paid: Ksh ${totalPaid.toLocaleString()}`);
    console.log(`  - Total Balance: Ksh ${totalBalance.toLocaleString()}`);
    console.log(`  - Last Payment: 2026-02-15`);

    // Summary
    console.log('\n📊 Test Data Summary:\n');
    console.log(`✅ Invoices created: ${invoices.length}`);
    console.log(`✅ Payments created: ${payments.length}`);
    console.log(`✅ Customer updated: 1`);
    console.log(`✅ Total test data value: Ksh ${invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0).toLocaleString()}`);  

    console.log('\n🎯 Next Steps:');
    console.log('1. Login to your application');
    console.log('2. Navigate to Invoices page');
    console.log('3. Click "Pay" on an invoice to test payment recording');
    console.log('4. View customer balance updates in real-time');
    console.log('5. Check audit logs for activity tracking\n');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestData();
