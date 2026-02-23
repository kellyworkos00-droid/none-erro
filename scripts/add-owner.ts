import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function addCompanyOwner() {
  try {
    const email = 'pkingori14@gmail.com';
    const password = 'Owner@2026Kenya'; // Simple, good password with uppercase, number, special char
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ User ${email} already exists`);
      return;
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName: 'Peter',
        lastName: 'Kingori',
        role: 'ADMIN',
        isActive: true,
      },
    });

    console.log('✅ Company Owner account created successfully!');
    console.log('\nAccount Details:');
    console.log(`Email: ${newUser.email}`);
    console.log(`Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`Role: ${newUser.role}`);
    console.log(`Password: ${password}`);
    console.log('\n⚠️ Please save this password securely!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCompanyOwner();
