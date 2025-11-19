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
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

import { AuthModule as authModule } from '../index';

describe('Auth Module Index', () => {
  it('should export module definition', () => {
    expect(authModule).toBeDefined();
    expect(authModule.name).toBe('auth');
  });

  it('should have routes', () => {
    expect(authModule.routes).toBeDefined();
  });

  it('should have events', () => {
    expect(authModule.events).toBeDefined();
    if (authModule.events) {
      expect(authModule.events['auth.registered']).toBeDefined();
      expect(authModule.events['auth.login']).toBeDefined();
    }
  });

  it('should have init function', () => {
    expect(authModule.init).toBeDefined();
    expect(typeof authModule.init).toBe('function');
  });

  it('should have cleanup function', () => {
    expect(authModule.cleanup).toBeDefined();
    expect(typeof authModule.cleanup).toBe('function');
  });

  it('should initialize successfully', async () => {
    if (authModule.init) {
      await expect(authModule.init()).resolves.not.toThrow();
    }
  });

  it('should cleanup successfully', async () => {
    if (authModule.cleanup) {
      await expect(authModule.cleanup()).resolves.not.toThrow();
    }
  });
});
