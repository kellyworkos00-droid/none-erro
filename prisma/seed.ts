import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ==========================================================================
  // 1. Create Default Admin User
  // ==========================================================================
  const hashedPassword = await bcrypt.hash('Admin@123!', 12);
  
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kellyos.com' },
    update: {},
    create: {
      email: 'admin@kellyos.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // Create Finance Manager
  const financeManagerPassword = await bcrypt.hash('Finance@123!', 12);
  const financeManager = await prisma.user.upsert({
    where: { email: 'finance@kellyos.com' },
    update: {},
    create: {
      email: 'finance@kellyos.com',
      password: financeManagerPassword,
      firstName: 'Finance',
      lastName: 'Manager',
      role: 'FINANCE_MANAGER',
      isActive: true,
    },
  });
  console.log('✅ Finance manager created:', financeManager.email);

  // Create Company Owner
  const ownerPassword = await bcrypt.hash('Owner@2026Kenya', 12);
  const companyOwner = await prisma.user.upsert({
    where: { email: 'pkingori14@gmail.com' },
    update: {},
    create: {
      email: 'pkingori14@gmail.com',
      password: ownerPassword,
      firstName: 'Owner',
      lastName: 'Account',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('✅ Company owner created:', companyOwner.email);

  // ==========================================================================
  // 2. Create Chart of Accounts (Double-Entry System)
  // ==========================================================================
  const accounts = [
    // ASSETS
    {
      accountCode: '1010',
      accountName: 'DTB Bank Account (788925)',
      accountType: 'ASSET',
      description: 'Main DTB bank account for PayBill 516600',
      currentBalance: 0,
    },
    {
      accountCode: '1200',
      accountName: 'Accounts Receivable',
      accountType: 'ASSET',
      description: 'Amount owed by customers',
      currentBalance: 0,
    },
    {
      accountCode: '1300',
      accountName: 'Cash Clearing Account',
      accountType: 'ASSET',
      description: 'Temporary account for unmatched transactions',
      currentBalance: 0,
    },
    // REVENUE
    {
      accountCode: '4000',
      accountName: 'Sales Revenue',
      accountType: 'REVENUE',
      description: 'Revenue from sales',
      currentBalance: 0,
    },
    {
      accountCode: '4100',
      accountName: 'Service Revenue',
      accountType: 'REVENUE',
      description: 'Revenue from services',
      currentBalance: 0,
    },
    // EQUITY
    {
      accountCode: '3000',
      accountName: 'Owner\'s Equity',
      accountType: 'EQUITY',
      description: 'Owner\'s capital',
      currentBalance: 0,
    },
  ];

  for (const account of accounts) {
    await prisma.account.upsert({
      where: { accountCode: account.accountCode },
      update: {},
      create: account,
    });
  }
  console.log('✅ Chart of accounts created');

  // ==========================================================================
  // 3. Create Sample Customers
  // ==========================================================================
  const customers = [
    {
      customerCode: 'CUST-0001',
      name: 'Acme Corporation Ltd',
      email: 'billing@acme.com',
      phone: '+254712345678',
      billingAddress: 'Nairobi, Kenya',
      currentBalance: 0,
      isActive: true,
    },
    {
      customerCode: 'CUST-0002',
      name: 'Tech Solutions Kenya',
      email: 'accounts@techsolutions.co.ke',
      phone: '+254723456789',
      billingAddress: 'Mombasa, Kenya',
      currentBalance: 0,
      isActive: true,
    },
    {
      customerCode: 'CUST-0003',
      name: 'Global Traders Inc',
      email: 'finance@globaltraders.com',
      phone: '+254734567890',
      billingAddress: 'Kisumu, Kenya',
      currentBalance: 0,
      isActive: true,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { customerCode: customer.customerCode },
      update: {},
      create: customer,
    });
  }
  console.log('✅ Sample customers created');

  // ==========================================================================
  // 4. Create Sample Invoices
  // ==========================================================================
  const acmeCustomer = await prisma.customer.findUnique({
    where: { customerCode: 'CUST-0001' },
  });

  const techSolutionsCustomer = await prisma.customer.findUnique({
    where: { customerCode: 'CUST-0002' },
  });

  if (acmeCustomer) {
    const invoice1 = await prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-2024-0001' },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-0001',
        customerId: acmeCustomer.id,
        subtotal: 50000,
        taxAmount: 8000,
        totalAmount: 58000,
        balanceAmount: 58000,
        paidAmount: 0,
        status: 'SENT',
        issueDate: new Date('2024-01-15'),
        dueDate: new Date('2024-02-15'),
        description: 'Website Development Services',
      },
    });
    console.log('✅ Invoice created:', invoice1.invoiceNumber);
  }

  if (techSolutionsCustomer) {
    const invoice2 = await prisma.invoice.upsert({
      where: { invoiceNumber: 'INV-2024-0002' },
      update: {},
      create: {
        invoiceNumber: 'INV-2024-0002',
        customerId: techSolutionsCustomer.id,
        subtotal: 75000,
        taxAmount: 12000,
        totalAmount: 87000,
        balanceAmount: 87000,
        paidAmount: 0,
        status: 'SENT',
        issueDate: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        description: 'Software Consulting - January 2024',
      },
    });
    console.log('✅ Invoice created:', invoice2.invoiceNumber);
  }

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Login Credentials:');
  console.log('Admin: admin@kellyos.com / Admin@123!');
  console.log('Finance Manager: finance@kellyos.com / Finance@123!');
  console.log('Company Owner: pkingori14@gmail.com / Owner@2026Kenya');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
