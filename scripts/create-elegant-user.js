/**
 * Create Elegant staff user account
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createElegantUser() {
  console.log('Starting user creation...');
  const prisma = new PrismaClient();
  
  try {
    const email = 'elegant@kelly.saff';
    const password = 'Elegant@Kelly2026';

    console.log(`Checking if user ${email} exists...`);

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      console.log(`✅ User ${email} already exists`);
      console.log(`   Role: ${existing.role}`);
      console.log(`   Active: ${existing.isActive}`);
      process.exit(0);
    }

    console.log('User not found. Creating...');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed');

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Elegant',
        lastName: 'Staff',
        role: 'POS_OPERATOR',
        isActive: true,
      },
    });

    console.log(`✅ User created successfully!`);
    console.log(`\n📋 Login Details:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: POS_OPERATOR`);
    console.log(`   Status: Active\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

createElegantUser();
