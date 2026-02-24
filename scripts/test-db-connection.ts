/**
 * Test Database Connection
 * Verifies the database is accessible and contains data
 */

import prisma from '../lib/prisma';

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    // Test 1: Check database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test 2: Count users
    const userCount = await prisma.user.count();
    console.log(`✅ Users in database: ${userCount}`);
    
    // Test 3: List users
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });
      console.log('\n📋 User accounts:');
      users.forEach((user) => {
        console.log(`  - ${user.email} (${user.firstName} ${user.lastName}) [${user.role}] - Created: ${user.createdAt.toLocaleDateString()}`);
      });
    }
    
    // Test 4: Count other records
    const [customerCount, invoiceCount, productCount] = await Promise.all([
      prisma.customer.count(),
      prisma.invoice.count(),
      prisma.product.count(),
    ]);
    
    console.log('\n📊 Database statistics:');
    console.log(`  - Customers: ${customerCount}`);
    console.log(`  - Invoices: ${invoiceCount}`);
    console.log(`  - Products: ${productCount}`);
    
    console.log('\n✅ Database is fully connected and operational!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
