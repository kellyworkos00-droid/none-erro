/**
 * Script to assign POS_OPERATOR role to a user
 * Usage: npx ts-node scripts/assign-pos-role.ts
 */

import prisma from '../lib/prisma';

async function assignPosRole() {
  try {
    const email = 'elegant@kelly.saff';

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Update user role to POS_OPERATOR
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        role: 'POS_OPERATOR',
      },
    });

    console.log(`✅ Successfully assigned POS_OPERATOR role to ${email}`);
    console.log(`   Name: ${updatedUser.firstName} ${updatedUser.lastName}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Status: ${updatedUser.isActive ? 'Active' : 'Inactive'}`);
  } catch (error) {
    console.error('❌ Error assigning role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignPosRole();
