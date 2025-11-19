import { PrismaClient, UserRole, PostStatus } from '@prisma/client';
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

  // Clean existing data (order matters for foreign keys)
  await prisma.post.deleteMany();
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

  // Create sample posts
  const posts = await Promise.all([
    prisma.post.create({
      data: {
        title: 'Welcome to NexusCore',
        slug: 'welcome-to-nexuscore',
        content: `# Welcome to NexusCore

NexusCore is a production-ready, modular, event-driven full-stack boilerplate built with Node.js, TypeScript, React, and modern best practices.

## Key Features

- **Event-Driven Architecture**: Loose coupling between modules using EventBus
- **Dynamic Module Loading**: Auto-discovery of modules with no manual registration
- **Type Safety**: End-to-end type safety with TypeScript and Zod
- **Authentication & Authorization**: JWT-based auth with RBAC
- **Modern Stack**: Express, Prisma, React 18, Vite, TailwindCSS

Get started by exploring the codebase and reading the documentation!`,
        excerpt: 'An introduction to NexusCore - a production-ready full-stack boilerplate.',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: adminUser.id,
        metaTitle: 'Welcome to NexusCore - Modern Full-Stack Boilerplate',
        metaDescription:
          'Learn about NexusCore, a production-ready boilerplate with event-driven architecture, authentication, and modern development practices.',
      },
    }),
    prisma.post.create({
      data: {
        title: 'Building Scalable APIs with Event-Driven Architecture',
        slug: 'building-scalable-apis-event-driven',
        content: `# Building Scalable APIs with Event-Driven Architecture

Event-driven architecture is a powerful pattern for building scalable and maintainable applications.

## Benefits

1. **Loose Coupling**: Modules don't need to know about each other
2. **Extensibility**: Easy to add new features without modifying existing code
3. **Maintainability**: Clear separation of concerns

## Example

\`\`\`typescript
// Emit an event
eventBus.emit('user.registered', { userId: user.id, email: user.email });

// Listen to events
eventBus.on('user.registered', async (data) => {
  await sendWelcomeEmail(data.email);
});
\`\`\`

This pattern is used throughout NexusCore for maximum flexibility.`,
        excerpt:
          'Learn how event-driven architecture helps build scalable and maintainable APIs.',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(Date.now() - 86400000), // 1 day ago
        authorId: moderatorUser.id,
        metaTitle: 'Event-Driven Architecture for Scalable APIs',
        metaDescription:
          'Discover the benefits of event-driven architecture and how it improves API scalability and maintainability.',
        viewCount: 42,
      },
    }),
    prisma.post.create({
      data: {
        title: 'TypeScript Best Practices for Node.js',
        slug: 'typescript-best-practices-nodejs',
        content: `# TypeScript Best Practices for Node.js

TypeScript brings type safety to Node.js development. Here are some best practices.

## 1. Enable Strict Mode

Always use \`"strict": true\` in your tsconfig.json.

## 2. Use Zod for Runtime Validation

TypeScript only validates at compile time. Use Zod for runtime validation:

\`\`\`typescript
const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
\`\`\`

## 3. Avoid \`any\`

Never use \`any\` unless absolutely necessary. Use \`unknown\` instead.`,
        excerpt: 'Essential TypeScript best practices for building robust Node.js applications.',
        status: PostStatus.DRAFT,
        authorId: regularUser.id,
        metaTitle: 'TypeScript Best Practices - Node.js Development',
        metaDescription:
          'Learn TypeScript best practices including strict mode, Zod validation, and type safety patterns.',
      },
    }),
    prisma.post.create({
      data: {
        title: 'Authentication & Authorization in Modern Web Apps',
        slug: 'authentication-authorization-modern-web',
        content: `# Authentication & Authorization in Modern Web Apps

Implementing secure authentication is crucial for any web application.

## Authentication Strategies

1. **JWT Access Tokens**: Short-lived tokens stored in memory
2. **Refresh Tokens**: Long-lived tokens in HTTP-only cookies
3. **RBAC**: Role-based access control for authorization

## Security Best Practices

- Use bcrypt with at least 12 rounds for password hashing
- Store refresh tokens in HTTP-only cookies to prevent XSS
- Implement CSRF protection
- Use rate limiting on auth endpoints

NexusCore implements all these patterns out of the box!`,
        excerpt: 'Learn how to implement secure authentication and authorization in web applications.',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(Date.now() - 172800000), // 2 days ago
        authorId: adminUser.id,
        metaTitle: 'Authentication & Authorization Best Practices',
        metaDescription:
          'Comprehensive guide to implementing secure authentication with JWT, refresh tokens, and RBAC.',
        viewCount: 127,
      },
    }),
    prisma.post.create({
      data: {
        title: 'Database Design Patterns with Prisma',
        slug: 'database-design-patterns-prisma',
        content: `# Database Design Patterns with Prisma

Prisma is a next-generation ORM that makes database access easy and type-safe.

## Key Features

- Type-safe database queries
- Auto-generated types
- Migration system
- Powerful query engine

## Example Schema

\`\`\`prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  posts     Post[]
  createdAt DateTime @default(now())
}
\`\`\`

Clean, readable, and type-safe!`,
        excerpt: 'Explore database design patterns and best practices using Prisma ORM.',
        status: PostStatus.ARCHIVED,
        authorId: moderatorUser.id,
        metaTitle: 'Database Design with Prisma ORM',
        metaDescription:
          'Learn database design patterns, migration strategies, and type-safe queries with Prisma.',
      },
    }),
  ]);

  console.log(`📝 Created ${posts.length} sample posts`);

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
  const postCount = await prisma.post.count();
  console.log(`   Users: ${userCount}`);
  console.log(`   Posts: ${postCount}`);
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
