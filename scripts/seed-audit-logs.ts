import prisma from '../lib/prisma';

async function seedAuditLogs() {
  try {
    console.log('🌱 Seeding audit logs...');

    // Get admin user
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@kellyos.com' },
    });

    const owner = await prisma.user.findUnique({
      where: { email: 'pkingori14@gmail.com' },
    });

    if (!admin || !owner) {
      console.error('❌ Users not found. Please run create-users.ts first');
      return;
    }

    // Create sample audit logs
    const auditLogs = [
      {
        userId: admin.id,
        action: 'LOGIN',
        description: `User ${admin.email} logged in`,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: admin.id,
        action: 'CREATE_INVOICE',
        entityType: 'Invoice',
        entityId: '1',
        description: 'Created new invoice INV-001',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: owner.id,
        action: 'LOGIN',
        description: `User ${owner.email} logged in`,
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: owner.id,
        action: 'CREATE_CUSTOMER',
        entityType: 'Customer',
        entityId: '1',
        description: 'Created new customer',
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: admin.id,
        action: 'UPLOAD_STATEMENT',
        entityType: 'Transaction',
        description: 'Uploaded bank statement with 25 transactions',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: owner.id,
        action: 'CREATE_PRODUCT',
        entityType: 'Product',
        entityId: '1',
        description: 'Created new product',
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: admin.id,
        action: 'RECONCILE_PAYMENT',
        entityType: 'Payment',
        entityId: '1',
        description: 'Reconciled payment for invoice INV-001',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      {
        userId: owner.id,
        action: 'CREATE_EXPENSE',
        entityType: 'Expense',
        entityId: '1',
        description: 'Created new expense entry',
        ipAddress: '192.168.1.45',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    ];

    for (const log of auditLogs) {
      await prisma.auditLog.create({ data: log });
    }

    console.log(`✅ Created ${auditLogs.length} audit logs`);

    const total = await prisma.auditLog.count();
    console.log(`📊 Total audit logs in database: ${total}`);

  } catch (error) {
    console.error('❌ Error seeding audit logs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedAuditLogs();
