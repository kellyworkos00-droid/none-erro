import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function checkCredentials() {
  const checks = [
    { email: 'admin@kellyos.com', password: 'Admin@123' },
    { email: 'pkingori14@gmail.com', password: 'owner@2026' },
  ];

  try {
    for (const { email, password } of checks) {
      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        console.log(`${email} -> NOT_FOUND`);
        continue;
      }

      const passwordMatches = await bcrypt.compare(password, user.password);
      console.log(
        `${email} -> ${passwordMatches ? 'PASSWORD_MATCH' : 'PASSWORD_MISMATCH'} | role=${user.role} | active=${user.isActive}`
      );
    }
  } catch (error) {
    console.error('Credential check failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkCredentials();
