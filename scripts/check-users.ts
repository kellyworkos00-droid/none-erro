import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function checkUsers() {
  console.log('\n🔍 CHECKING SYSTEM USERS\n');
  console.log('=' .repeat(80));

  try {
    // Get all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (allUsers.length === 0) {
      console.log('❌ NO USERS FOUND IN DATABASE\n');
      console.log('Run: npm run prisma:seed OR ts-node scripts/create-users.ts');
      console.log('=' .repeat(80) + '\n');
      return;
    }

    console.log(`📊 Total Users: ${allUsers.length}\n`);

    // Display each user
    allUsers.forEach((user, index) => {
      const isAdmin = user.role === 'ADMIN';
      const isActive = user.isActive ? '✅' : '❌';
      const lastLoginStr = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never';

      console.log(`${index + 1}. [${isActive}] ${user.firstName} ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}${isAdmin ? ' (ADMIN)' : ''}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log(`   Last Login: ${lastLoginStr}`);
      console.log('');
    });

    // Check credentials for default users
    console.log('=' .repeat(80));
    console.log('\n🔐 CREDENTIAL STATUS\n');

    const credentialChecks = [
      { email: 'admin@kellyos.com', password: 'Admin@123', role: 'ADMIN' },
      { email: 'pkingori14@gmail.com', password: 'owner@2026', role: 'FINANCE_MANAGER' },
    ];

    for (const { email, password, role } of credentialChecks) {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        console.log(`❌ ${email}`);
        console.log(`   Status: NOT_FOUND (not created yet)`);
        console.log(`   Expected Role: ${role}`);
        console.log('');
        continue;
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      const status = passwordMatches ? '✅ PASSWORD_MATCH' : '❌ PASSWORD_MISMATCH';

      console.log(`${status} ${email}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.role} ${user.role === role ? '✅' : '❌'}`);
      console.log(`   Active: ${user.isActive ? '✅ Yes' : '❌ No'}`);
      console.log('');
    }

    // Summary by role
    console.log('=' .repeat(80));
    console.log('\n📋 USERS BY ROLE\n');

    const roles = ['ADMIN', 'FINANCE_MANAGER', 'FINANCE_STAFF', 'VIEWER'];
    for (const role of roles) {
      const count = allUsers.filter((u) => u.role === role).length;
      const active = allUsers.filter((u) => u.role === role && u.isActive).length;
      console.log(`${role.padEnd(20)} : ${count} total (${active} active)`);
    }

    // Active vs Inactive
    console.log('\n' + '-'.repeat(80));
    const activeCount = allUsers.filter((u) => u.isActive).length;
    const inactiveCount = allUsers.filter((u) => !u.isActive).length;
    console.log(`Active Users    : ${activeCount}`);
    console.log(`Inactive Users  : ${inactiveCount}`);

    console.log('\n' + '=' .repeat(80) + '\n');

    // Recommendations
    if (allUsers.length === 0) {
      console.log('⚠️  RECOMMENDATION: Create default users first\n');
    } else if (!allUsers.some((u) => u.role === 'ADMIN')) {
      console.log('⚠️  RECOMMENDATION: Create an ADMIN user for management\n');
    } else {
      console.log('✅ System has admin users created\n');
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
