import { logger } from '../../../core/logger';
import { prisma } from '@nexuscore/db';

// Mock prisma
jest.mock('@nexuscore/db', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import { PostEventHandlers } from '../posts.events';

describe('Posts Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('post.created event', () => {
    it('should handle post created event and create audit log', async () => {
      const payload = {
        post: {
          id: 'post-123',
          title: 'Test Post',
          status: 'DRAFT',
        },
        userId: 'user-123',
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await PostEventHandlers['post.created'](payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          action: 'CREATE',
          entity: 'POST',
          entityId: 'post-123',
          metadata: {
            title: 'Test Post',
            status: 'DRAFT',
          },
        },
      });

      expect(logger.info).toHaveBeenCalledWith('Post created event handled', {
        postId: 'post-123',
      });
    });

    it('should handle post created event with different data', async () => {
      const payload = {
        post: {
          id: 'post-456',
          title: 'Another Post',
          status: 'PUBLISHED',
        },
        userId: 'user-456',
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await PostEventHandlers['post.created'](payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-456',
          action: 'CREATE',
          entity: 'POST',
          entityId: 'post-456',
          metadata: {
            title: 'Another Post',
            status: 'PUBLISHED',
          },
        },
      });
    });
  });

  describe('post.updated event', () => {
    it('should handle post updated event and create audit log', async () => {
      const payload = {
        post: {
          id: 'post-789',
          title: 'Updated Post',
          status: 'DRAFT',
        },
        userId: 'user-789',
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await PostEventHandlers['post.updated'](payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-789',
          action: 'UPDATE',
          entity: 'POST',
          entityId: 'post-789',
          metadata: {
            title: 'Updated Post',
            status: 'DRAFT',
          },
        },
      });

      expect(logger.info).toHaveBeenCalledWith('Post updated event handled', {
        postId: 'post-789',
      });
    });
  });

  describe('post.published event', () => {
    it('should handle post published event and create audit log', async () => {
      const publishedAt = new Date('2024-01-01');
      const payload = {
        post: {
          id: 'post-111',
          title: 'Published Post',
          publishedAt,
        },
        userId: 'user-111',
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await PostEventHandlers['post.published'](payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-111',
          action: 'PUBLISH',
          entity: 'POST',
          entityId: 'post-111',
          metadata: {
            title: 'Published Post',
            publishedAt,
          },
        },
      });

      expect(logger.info).toHaveBeenCalledWith('Post published event handled', {
        postId: 'post-111',
      });
    });
  });

  describe('post.deleted event', () => {
    it('should handle post deleted event and create audit log', async () => {
      const payload = {
        postId: 'post-222',
        userId: 'user-222',
      };

      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await PostEventHandlers['post.deleted'](payload);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-222',
          action: 'DELETE',
          entity: 'POST',
          entityId: 'post-222',
          metadata: {
            deletedAt: expect.any(String),
          },
        },
      });

      expect(logger.info).toHaveBeenCalledWith('Post deleted event handled', {
        postId: 'post-222',
      });
    });
  });
});
