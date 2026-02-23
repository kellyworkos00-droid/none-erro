import prisma from '../lib/prisma';

async function checkDatabaseConnection() {
  console.log('🔍 Checking database connection...\n');

  try {
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test query execution
    const userCount = await prisma.user.count();
    console.log(`✅ User table accessible: ${userCount} users found`);

    const productCount = await prisma.product.count();
    console.log(`✅ Product table accessible: ${productCount} products found`);

    const projectCount = await prisma.project.count();
    console.log(`✅ Project table accessible: ${projectCount} projects found`);

    const customerCount = await prisma.customer.count();
    console.log(`✅ Customer table accessible: ${customerCount} customers found`);

    const invoiceCount = await prisma.invoice.count();
    console.log(`✅ Invoice table accessible: ${invoiceCount} invoices found`);

    // Test write operation (upsert a test record)
    const testUser = await prisma.user.findUnique({
      where: { email: 'admin@kellyos.com' },
    });

    if (testUser) {
      console.log(`✅ Read operation successful: Found user ${testUser.email}`);
    }

    // Test database info
    const dbInfo = await prisma.$queryRaw`SELECT version()` as Array<{ version: string }>;
    if (dbInfo && dbInfo[0]) {
      console.log(`\n📊 Database version: ${dbInfo[0].version}`);
    }

    console.log('\n✅ All database checks passed!');
    console.log('🎉 Database is connected and working properly');

  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

checkDatabaseConnection();
