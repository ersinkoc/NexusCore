import { PostsService } from '../posts.service';
import { prisma } from '@nexuscore/db';
import { PostStatus } from '@nexuscore/types';
import { NotFoundError, ForbiddenError } from '../../../core/errors';
import { eventBus } from '../../../core/event-bus';

// Mock dependencies
jest.mock('@nexuscore/db', () => ({
  prisma: {
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('../../../core/event-bus', () => ({
  eventBus: {
    emit: jest.fn(),
  },
}));

jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PostsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a post with unique slug', async () => {
      const userId = 'user-123';
      const input = {
        title: 'Test Post',
        content: 'Test content',
        status: PostStatus.DRAFT as const,
      };

      const createdPost = {
        id: 'post-123',
        ...input,
        slug: 'test-post',
        excerpt: null,
        publishedAt: null,
        metaTitle: null,
        metaDescription: null,
        viewCount: 0,
        authorId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        author: {
          id: userId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.post.create as jest.Mock).mockResolvedValue(createdPost);

      const result = await PostsService.create(userId, input);

      expect(result).toEqual(createdPost);
      expect(prisma.post.create).toHaveBeenCalledWith({
        data: {
          ...input,
          slug: 'test-post',
          authorId: userId,
        },
        include: {
          author: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
      expect(eventBus.emit).toHaveBeenCalledWith('post.created', {
        post: createdPost,
        userId,
      });
    });

    it('should create post with timestamp suffix if slug exists', async () => {
      const userId = 'user-123';
      const input = {
        title: 'Test Post',
        content: 'Test content',
        status: PostStatus.DRAFT as const,
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
      (prisma.post.create as jest.Mock).mockResolvedValue({
        id: 'post-123',
        ...input,
        slug: expect.stringContaining('test-post-'),
        authorId: userId,
        author: {},
      });

      await PostsService.create(userId, input);

      expect(prisma.post.create).toHaveBeenCalled();
      const createCall = (prisma.post.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.slug).toMatch(/test-post-\d+/);
    });
  });

  describe('findMany', () => {
    it('should return posts with pagination', async () => {
      const query = { page: 1, limit: 10 };
      const mockPosts = [
        { id: 'post-1', title: 'Post 1', author: {} },
        { id: 'post-2', title: 'Post 2', author: {} },
      ];

      (prisma.post.findMany as jest.Mock).mockResolvedValue(mockPosts);
      (prisma.post.count as jest.Mock).mockResolvedValue(2);

      const result = await PostsService.findMany(query);

      expect(result.posts).toEqual(mockPosts);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const query = { page: 1, limit: 10, status: PostStatus.PUBLISHED };

      (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.post.count as jest.Mock).mockResolvedValue(0);

      await PostsService.findMany(query);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { status: PostStatus.PUBLISHED },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should filter by authorId', async () => {
      const query = { page: 1, limit: 10, authorId: 'user-123' };

      (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.post.count as jest.Mock).mockResolvedValue(0);

      await PostsService.findMany(query);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: { authorId: 'user-123' },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should search posts', async () => {
      const query = { page: 1, limit: 10, search: 'test' };

      (prisma.post.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.post.count as jest.Mock).mockResolvedValue(0);

      await PostsService.findMany(query);

      expect(prisma.post.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'test', mode: 'insensitive' } },
            { content: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });
  });

  describe('findById', () => {
    it('should return post and increment view count', async () => {
      const postId = 'post-123';
      const mockPost = {
        id: postId,
        title: 'Test Post',
        viewCount: 5,
        author: {},
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);
      (prisma.post.update as jest.Mock).mockResolvedValue({ ...mockPost, viewCount: 6 });

      const result = await PostsService.findById(postId);

      expect(result).toEqual(mockPost);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundError if post not found', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PostsService.findById('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findBySlug', () => {
    it('should return post by slug and increment view count', async () => {
      const slug = 'test-post';
      const mockPost = {
        id: 'post-123',
        slug,
        title: 'Test Post',
        viewCount: 5,
        author: {},
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(mockPost);
      (prisma.post.update as jest.Mock).mockResolvedValue({ ...mockPost, viewCount: 6 });

      const result = await PostsService.findBySlug(slug);

      expect(result).toEqual(mockPost);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { slug },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundError if post not found', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PostsService.findBySlug('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('update', () => {
    it('should update post when user is author', async () => {
      const postId = 'post-123';
      const userId = 'user-123';
      const input = { title: 'Updated Title' };
      const existingPost = {
        id: postId,
        authorId: userId,
        title: 'Old Title',
      };
      const updatedPost = { ...existingPost, ...input, author: {} };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.update as jest.Mock).mockResolvedValue(updatedPost);

      const result = await PostsService.update(postId, userId, 'USER', input);

      expect(result).toEqual(updatedPost);
      expect(eventBus.emit).toHaveBeenCalledWith('post.updated', {
        post: updatedPost,
        userId,
      });
    });

    it('should update post when user is admin', async () => {
      const postId = 'post-123';
      const userId = 'admin-123';
      const input = { title: 'Updated Title' };
      const existingPost = {
        id: postId,
        authorId: 'other-user',
        title: 'Old Title',
      };
      const updatedPost = { ...existingPost, ...input, author: {} };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.update as jest.Mock).mockResolvedValue(updatedPost);

      const result = await PostsService.update(postId, userId, 'ADMIN', input);

      expect(result).toEqual(updatedPost);
    });

    it('should throw NotFoundError if post not found', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        PostsService.update('nonexistent', 'user-123', 'USER', {})
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user is not author or admin', async () => {
      const existingPost = {
        id: 'post-123',
        authorId: 'other-user',
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);

      await expect(
        PostsService.update('post-123', 'user-123', 'USER', {})
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('should delete post when user is author', async () => {
      const postId = 'post-123';
      const userId = 'user-123';
      const existingPost = {
        id: postId,
        authorId: userId,
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.delete as jest.Mock).mockResolvedValue(existingPost);

      const result = await PostsService.delete(postId, userId, 'USER');

      expect(result).toEqual({ message: 'Post deleted successfully' });
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: postId } });
      expect(eventBus.emit).toHaveBeenCalledWith('post.deleted', { postId, userId });
    });

    it('should delete post when user is admin', async () => {
      const postId = 'post-123';
      const userId = 'admin-123';
      const existingPost = {
        id: postId,
        authorId: 'other-user',
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.delete as jest.Mock).mockResolvedValue(existingPost);

      await PostsService.delete(postId, userId, 'ADMIN');

      expect(prisma.post.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundError if post not found', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PostsService.delete('nonexistent', 'user-123', 'USER')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError if user is not author or admin', async () => {
      const existingPost = {
        id: 'post-123',
        authorId: 'other-user',
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);

      await expect(PostsService.delete('post-123', 'user-123', 'USER')).rejects.toThrow(
        ForbiddenError
      );
    });
  });

  describe('publish', () => {
    it('should publish post when user is author', async () => {
      const postId = 'post-123';
      const userId = 'user-123';
      const existingPost = {
        id: postId,
        authorId: userId,
        status: PostStatus.DRAFT,
      };
      const publishedPost = {
        ...existingPost,
        status: PostStatus.PUBLISHED,
        publishedAt: expect.any(Date),
        author: {},
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.update as jest.Mock).mockResolvedValue(publishedPost);

      const result = await PostsService.publish(postId, userId, 'USER');

      expect(result.status).toBe(PostStatus.PUBLISHED);
      expect(eventBus.emit).toHaveBeenCalledWith('post.published', {
        post: publishedPost,
        userId,
      });
    });

    it('should publish post when user is admin', async () => {
      const postId = 'post-123';
      const userId = 'admin-123';
      const existingPost = {
        id: postId,
        authorId: 'other-user',
        status: PostStatus.DRAFT,
      };
      const publishedPost = {
        ...existingPost,
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        author: {},
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);
      (prisma.post.update as jest.Mock).mockResolvedValue(publishedPost);

      await PostsService.publish(postId, userId, 'ADMIN');

      expect(prisma.post.update).toHaveBeenCalled();
    });

    it('should throw NotFoundError if post not found', async () => {
      (prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PostsService.publish('nonexistent', 'user-123', 'USER')).rejects.toThrow(
        NotFoundError
      );
    });

    it('should throw ForbiddenError if user is not author or admin', async () => {
      const existingPost = {
        id: 'post-123',
        authorId: 'other-user',
      };

      (prisma.post.findUnique as jest.Mock).mockResolvedValue(existingPost);

      await expect(PostsService.publish('post-123', 'user-123', 'USER')).rejects.toThrow(
        ForbiddenError
      );
    });
  });
});
