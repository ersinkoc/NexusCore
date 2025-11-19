import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
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
      password: await hashPassword('Admin123!'),
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('👤 Created admin user:', adminUser.email);

  // Create moderator user
  const moderatorUser = await prisma.user.create({
    data: {
      email: 'moderator@nexuscore.local',
      password: await hashPassword('Moderator123!'),
      firstName: 'Jane',
      lastName: 'Smith',
      role: UserRole.MODERATOR,
      isActive: true,
    },
  });

  console.log('👤 Created moderator user:', moderatorUser.email);

  // Create regular users
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@nexuscore.local',
      password: await hashPassword('User123!'),
      firstName: 'John',
      lastName: 'Doe',
      role: UserRole.USER,
      isActive: true,
    },
  });

  console.log('👤 Created regular user:', regularUser.email);

  // Create additional sample users
  const sampleUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: 'alice@nexuscore.local',
        password: await hashPassword('Alice123!'),
        firstName: 'Alice',
        lastName: 'Johnson',
        role: UserRole.USER,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@nexuscore.local',
        password: await hashPassword('Bob123!'),
        firstName: 'Bob',
        lastName: 'Williams',
        role: UserRole.USER,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'inactive@nexuscore.local',
        password: await hashPassword('Inactive123!'),
        firstName: 'Inactive',
        lastName: 'User',
        role: UserRole.USER,
        isActive: false,
      },
    }),
  ]);

  console.log(`👥 Created ${sampleUsers.length} additional sample users`);

  // Create audit logs for each user creation
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'SEED',
        entity: 'DATABASE',
        metadata: {
          message: 'Initial database seed completed',
          timestamp: new Date().toISOString(),
        },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: adminUser.id,
        metadata: {
          role: 'ADMIN',
          email: adminUser.email,
        },
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: moderatorUser.id,
        metadata: {
          role: 'MODERATOR',
          email: moderatorUser.email,
        },
      },
    }),
  ]);

  console.log('📋 Created audit logs');

  console.log('\n✅ Database seeding completed!');
  console.log('\n📝 Test Credentials:');
  console.log('   Admin:     admin@nexuscore.local / Admin123!');
  console.log('   Moderator: moderator@nexuscore.local / Moderator123!');
  console.log('   User:      user@nexuscore.local / User123!');
  console.log('   Alice:     alice@nexuscore.local / Alice123!');
  console.log('   Bob:       bob@nexuscore.local / Bob123!');
  console.log('\n📊 Summary:');
  const userCount = await prisma.user.count();
  const auditCount = await prisma.auditLog.count();
  console.log(`   Users: ${userCount}`);
  console.log(`   Audit Logs: ${auditCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
