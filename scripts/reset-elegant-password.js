/**
 * Reset password for Elegant user
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  console.log('Password reset script...\n');
  const prisma = new PrismaClient();
  
  try {
    const email = 'elegant@kelly.saff';
    const newPassword = 'Elegant@Kelly2026';

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('❌ User not found');
      process.exit(1);
    }

    console.log(`Current status:`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Active: ${user.isActive}`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    const updated = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        isActive: true, // Ensure account is active
      },
    });

    console.log(`\n✅ Password reset successfully!\n`);
    console.log(`📋 Login Details:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: ${updated.role}`);
    console.log(`   Status: ${updated.isActive ? 'Active' : 'Inactive'}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

resetPassword();
