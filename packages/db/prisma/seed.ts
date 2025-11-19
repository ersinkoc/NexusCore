import { PrismaClient, UserRole } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Hash password (simplified version - in real app, use bcrypt)
 */
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Cleaned existing data');

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nexuscore.local',
      password: hashPassword('Admin123!'),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('👤 Created admin user:', adminUser.email);

  // Create regular user
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@nexuscore.local',
      password: hashPassword('User123!'),
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
      isActive: true,
    },
  });

  console.log('👤 Created regular user:', regularUser.email);

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'SEED',
      entity: 'DATABASE',
      metadata: {
        message: 'Initial database seed completed',
      },
    },
  });

  console.log('✅ Database seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin: admin@nexuscore.local / Admin123!');
  console.log('   User:  user@nexuscore.local / User123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
