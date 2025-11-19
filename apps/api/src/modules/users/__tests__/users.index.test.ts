// Mock dependencies before importing
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@nexuscore/db', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

import { UsersModule as usersModule } from '../index';

describe('Users Module Index', () => {
  it('should export module definition', () => {
    expect(usersModule).toBeDefined();
    expect(usersModule.name).toBe('users');
  });

  it('should have routes', () => {
    expect(usersModule.routes).toBeDefined();
  });

  it('should have init function', () => {
    expect(usersModule.init).toBeDefined();
    expect(typeof usersModule.init).toBe('function');
  });

  it('should have cleanup function', () => {
    expect(usersModule.cleanup).toBeDefined();
    expect(typeof usersModule.cleanup).toBe('function');
  });

  it('should initialize successfully', async () => {
    if (usersModule.init) {
      await expect(usersModule.init()).resolves.not.toThrow();
    }
  });

  it('should cleanup successfully', async () => {
    if (usersModule.cleanup) {
      await expect(usersModule.cleanup()).resolves.not.toThrow();
    }
  });
});
