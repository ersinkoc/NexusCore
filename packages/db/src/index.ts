import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient singleton instance
 * Prevents multiple instances in development with hot reload
 */

declare global {
  // eslint-disable-no-var
  var prisma: PrismaClient | undefined;
}

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    try {
      prismaInstance = global.prisma || new PrismaClient({
        log:
          process.env.NODE_ENV === 'development'
            ? ['query', 'error', 'warn']
            : ['error'],
      });

      if (process.env.NODE_ENV !== 'production') {
        global.prisma = prismaInstance;
      }
    } catch (error) {
      console.error('Failed to initialize PrismaClient:', error);
      throw new Error('Prisma client initialization failed. Please run "prisma generate"');
    }
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

// Export Prisma types
export * from '@prisma/client';
export type { Prisma } from '@prisma/client';
