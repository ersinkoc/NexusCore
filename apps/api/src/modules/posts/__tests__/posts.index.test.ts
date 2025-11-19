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
    post: {
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

import postsModule from '../index';

describe('Posts Module Index', () => {
  it('should export module definition', () => {
    expect(postsModule).toBeDefined();
    expect(postsModule.name).toBe('posts');
  });

  it('should have routes', () => {
    expect(postsModule.routes).toBeDefined();
  });

  it('should have events', () => {
    expect(postsModule.events).toBeDefined();
    if (postsModule.events) {
      expect(postsModule.events['post.created']).toBeDefined();
      expect(postsModule.events['post.updated']).toBeDefined();
      expect(postsModule.events['post.deleted']).toBeDefined();
    }
  });

  it('should have init function', () => {
    expect(postsModule.init).toBeDefined();
    expect(typeof postsModule.init).toBe('function');
  });

  it('should initialize successfully', async () => {
    if (postsModule.init) {
      await expect(postsModule.init()).resolves.not.toThrow();
    }
  });
});
