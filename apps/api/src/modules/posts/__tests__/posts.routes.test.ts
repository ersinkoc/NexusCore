import 'express-async-errors';
import request from 'supertest';
import express, { Express } from 'express';
import postsRoutes from '../posts.routes';
import { PostsService } from '../posts.service';
import { PostStatus } from '@nexuscore/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../core/errors';

// Mock prisma
jest.mock('@nexuscore/db', () => ({
  prisma: {
    post: {},
  },
}));

// Mock PostsService
jest.mock('../posts.service');

// Mock middleware
jest.mock('../../auth/auth.middleware', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'USER',
    };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Posts Routes Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use('/posts', postsRoutes);

    // Global error handler
    app.use(
      (
        err: any,
        _req: express.Request,
        res: express.Response,
        _next: express.NextFunction
      ) => {
        if (err instanceof ValidationError) {
          return res.status(400).json({ error: err.message });
        }
        if (err instanceof NotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        if (err instanceof ForbiddenError) {
          return res.status(403).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
    );
  });

  describe('GET /posts', () => {
    it('should return paginated posts', async () => {
      const mockResponse = {
        posts: [
          {
            id: 'post-1',
            title: 'Post 1',
            slug: 'post-1',
            status: PostStatus.PUBLISHED,
            author: { id: 'user-1', email: 'user1@example.com' },
          },
          {
            id: 'post-2',
            title: 'Post 2',
            slug: 'post-2',
            status: PostStatus.PUBLISHED,
            author: { id: 'user-2', email: 'user2@example.com' },
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      (PostsService.findMany as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app).get('/posts').expect(200);

      expect(response.body).toEqual(mockResponse);
      expect(PostsService.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
      });
    });

    it('should handle pagination parameters', async () => {
      const mockResponse = {
        posts: [],
        pagination: { page: 2, limit: 5, total: 10, totalPages: 2 },
      };

      (PostsService.findMany as jest.Mock).mockResolvedValue(mockResponse);

      await request(app).get('/posts?page=2&limit=5').expect(200);

      expect(PostsService.findMany).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
      });
    });

    it('should filter by status', async () => {
      const mockResponse = {
        posts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      (PostsService.findMany as jest.Mock).mockResolvedValue(mockResponse);

      await request(app).get('/posts?status=DRAFT').expect(200);

      expect(PostsService.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'DRAFT',
      });
    });

    it('should filter by authorId', async () => {
      const mockResponse = {
        posts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      (PostsService.findMany as jest.Mock).mockResolvedValue(mockResponse);

      await request(app).get(`/posts?authorId=${validUuid}`).expect(200);

      expect(PostsService.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        authorId: validUuid,
      });
    });

    it('should search posts', async () => {
      const mockResponse = {
        posts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      };

      (PostsService.findMany as jest.Mock).mockResolvedValue(mockResponse);

      await request(app).get('/posts?search=test').expect(200);

      expect(PostsService.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        search: 'test',
      });
    });
  });

  describe('GET /posts/:id', () => {
    it('should return post by id', async () => {
      const mockPost = {
        id: 'post-123',
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        author: { id: 'user-123', email: 'test@example.com' },
      };

      (PostsService.findById as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app).get('/posts/post-123').expect(200);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.findById).toHaveBeenCalledWith('post-123');
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.findById as jest.Mock).mockRejectedValue(
        new NotFoundError('Post not found')
      );

      const response = await request(app).get('/posts/nonexistent').expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /posts/slug/:slug', () => {
    it('should return post by slug', async () => {
      const mockPost = {
        id: 'post-123',
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        author: { id: 'user-123', email: 'test@example.com' },
      };

      (PostsService.findBySlug as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app)
        .get('/posts/slug/test-post')
        .expect(200);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.findBySlug).toHaveBeenCalledWith('test-post');
    });

    it('should return 404 for non-existent slug', async () => {
      (PostsService.findBySlug as jest.Mock).mockRejectedValue(
        new NotFoundError('Post not found')
      );

      const response = await request(app)
        .get('/posts/slug/nonexistent')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('POST /posts', () => {
    it('should create a new post', async () => {
      const createData = {
        title: 'New Post',
        content: 'Post content',
        status: PostStatus.DRAFT,
      };

      const mockPost = {
        id: 'post-123',
        ...createData,
        slug: 'new-post',
        authorId: 'user-123',
        author: { id: 'user-123', email: 'test@example.com' },
      };

      (PostsService.create as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app)
        .post('/posts')
        .send(createData)
        .expect(201);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.create).toHaveBeenCalledWith('user-123', createData);
    });

    it('should return 400 for missing title', async () => {
      const invalidData = {
        content: 'Post content',
        status: PostStatus.DRAFT,
      };

      (PostsService.create as jest.Mock).mockRejectedValue(
        new ValidationError('Invalid post data')
      );

      const response = await request(app)
        .post('/posts')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid post data');
    });

    it('should return 400 for missing content', async () => {
      const invalidData = {
        title: 'New Post',
        status: PostStatus.DRAFT,
      };

      (PostsService.create as jest.Mock).mockRejectedValue(
        new ValidationError('Invalid post data')
      );

      const response = await request(app)
        .post('/posts')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid post data');
    });
  });

  describe('PUT /posts/:id', () => {
    it('should update a post', async () => {
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const mockUpdatedPost = {
        id: 'post-123',
        ...updateData,
        slug: 'updated-title',
        status: PostStatus.DRAFT,
        authorId: 'user-123',
        author: { id: 'user-123', email: 'test@example.com' },
      };

      (PostsService.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

      const response = await request(app)
        .put('/posts/post-123')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(mockUpdatedPost);
      expect(PostsService.update).toHaveBeenCalledWith(
        'post-123',
        'user-123',
        'USER',
        updateData
      );
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.update as jest.Mock).mockRejectedValue(
        new NotFoundError('Post not found')
      );

      const response = await request(app)
        .put('/posts/nonexistent')
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized update', async () => {
      (PostsService.update as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app)
        .put('/posts/post-123')
        .send({ title: 'Updated' })
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('DELETE /posts/:id', () => {
    it('should delete a post', async () => {
      (PostsService.delete as jest.Mock).mockResolvedValue({
        message: 'Post deleted successfully',
      });

      const response = await request(app).delete('/posts/post-123').expect(200);

      expect(response.body.message).toContain('deleted');
      expect(PostsService.delete).toHaveBeenCalledWith(
        'post-123',
        'user-123',
        'USER'
      );
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.delete as jest.Mock).mockRejectedValue(
        new NotFoundError('Post not found')
      );

      const response = await request(app)
        .delete('/posts/nonexistent')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized delete', async () => {
      (PostsService.delete as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app).delete('/posts/post-123').expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('POST /posts/:id/publish', () => {
    it('should publish a post', async () => {
      const mockPublishedPost = {
        id: 'post-123',
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: 'user-123',
        author: { id: 'user-123', email: 'test@example.com' },
      };

      (PostsService.publish as jest.Mock).mockResolvedValue(mockPublishedPost);

      const response = await request(app)
        .post('/posts/post-123/publish')
        .expect(200);

      expect(response.body.status).toBe(PostStatus.PUBLISHED);
      expect(PostsService.publish).toHaveBeenCalledWith(
        'post-123',
        'user-123',
        'USER'
      );
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.publish as jest.Mock).mockRejectedValue(
        new NotFoundError('Post not found')
      );

      const response = await request(app)
        .post('/posts/nonexistent/publish')
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized publish', async () => {
      (PostsService.publish as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app)
        .post('/posts/post-123/publish')
        .expect(403);

      expect(response.body.error).toContain('permission');
    });
  });
});
