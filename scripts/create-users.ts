import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createUsers() {
  try {
    const adminPassword = 'Admin@123';
    const ownerPassword = 'owner@2026';

    // User 1: Admin Kelly
    const hashedPassword1 = await bcrypt.hash(adminPassword, 10);
    const user1 = await prisma.user.upsert({
      where: { email: 'admin@kellyos.com' },
      update: {
        password: hashedPassword1,
        firstName: 'Admin',
        lastName: 'Kelly',
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email: 'admin@kellyos.com',
        password: hashedPassword1,
        firstName: 'Admin',
        lastName: 'Kelly',
        role: 'ADMIN',
        isActive: true,
      },
    });
    console.log('✅ Created/Updated Admin user:', user1.email);

    // User 2: Peter Kingori
    const hashedPassword2 = await bcrypt.hash(ownerPassword, 10);
    const user2 = await prisma.user.upsert({
      where: { email: 'pkingori14@gmail.com' },
      update: {
        password: hashedPassword2,
        firstName: 'Peter',
        lastName: 'Kingori',
        role: 'FINANCE_MANAGER',
        isActive: true,
      },
      create: {
        email: 'pkingori14@gmail.com',
        password: hashedPassword2,
        firstName: 'Peter',
        lastName: 'Kingori',
        role: 'FINANCE_MANAGER',
        isActive: true,
      },
    });
    console.log('✅ Created/Updated Finance Manager user:', user2.email);

    console.log('\n📧 Users created successfully!');
    console.log('\nLogin credentials:');
    console.log(`1. Email: admin@kellyos.com | Password: ${adminPassword} | Role: ADMIN`);
    console.log(`2. Email: pkingori14@gmail.com | Password: ${ownerPassword} | Role: FINANCE_MANAGER`);
  } catch (error) {
    console.error('❌ Error creating users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
