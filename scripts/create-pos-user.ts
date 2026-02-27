/**
 * Script to create a new POS_OPERATOR user
 * Usage: npx ts-node scripts/create-pos-user.ts
 */

import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';

async function createPosUser() {
  try {
    const email = 'elegant@kelly.saff';
    const tempPassword = 'Elegant@Kelly2026'; // Temporary password
    const firstName = 'Elegant';
    const lastName = 'Staff';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  User with email ${email} already exists`);
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.isActive ? 'Active' : 'Inactive'}`);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'POS_OPERATOR',
        isActive: true,
      },
    });

    console.log(`✅ Successfully created POS_OPERATOR user`);
    console.log(`\n📋 User Details:`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Name: ${newUser.firstName} ${newUser.lastName}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Status: ${newUser.isActive ? 'Active' : 'Inactive'}`);
    console.log(`\n🔑 Temporary Password: ${tempPassword}`);
    console.log(`\n⚠️  Important:`);
    console.log(`   1. Save this temporary password securely`);
    console.log(`   2. The user must change it on first login`);
    console.log(`   3. User can only access POS functionality`);
  } catch (error) {
    console.error('❌ Error creating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createPosUser();
