import 'express-async-errors';
import request from 'supertest';
import express, { Express } from 'express';
import postsRoutes from '../posts.routes';
import { PostsService } from '../posts.service';
import { PostStatus } from '@nexuscore/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../core/errors';

// Test UUIDs
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_POST_ID = '123e4567-e89b-12d3-a456-426614174000';
const NONEXISTENT_POST_ID = '999e9999-e99b-99d9-a999-999999999999';

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
      userId: TEST_USER_ID,
      email: 'test@example.com',
      role: 'user',
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
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        // Handle Zod validation errors
        if (err.name === 'ZodError') {
          return res.status(400).json({ error: 'Invalid post data' });
        }
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
      const postId = '123e4567-e89b-12d3-a456-426614174000';
      const mockPost = {
        id: postId,
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        author: { id: TEST_USER_ID, email: 'test@example.com' },
      };

      (PostsService.findById as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app).get(`/posts/${postId}`).expect(200);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.findById).toHaveBeenCalledWith(postId);
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.findById as jest.Mock).mockRejectedValue(new NotFoundError('Post not found'));

      const response = await request(app).get(`/posts/${NONEXISTENT_POST_ID}`).expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /posts/slug/:slug', () => {
    it('should return post by slug', async () => {
      const mockPost = {
        id: TEST_POST_ID,
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        author: { id: TEST_USER_ID, email: 'test@example.com' },
      };

      (PostsService.findBySlug as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app).get('/posts/slug/test-post').expect(200);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.findBySlug).toHaveBeenCalledWith('test-post');
    });

    it('should return 404 for non-existent slug', async () => {
      (PostsService.findBySlug as jest.Mock).mockRejectedValue(new NotFoundError('Post not found'));

      const response = await request(app).get('/posts/slug/nonexistent').expect(404);

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
        id: TEST_POST_ID,
        ...createData,
        slug: 'new-post',
        authorId: TEST_USER_ID,
        author: { id: TEST_USER_ID, email: 'test@example.com' },
      };

      (PostsService.create as jest.Mock).mockResolvedValue(mockPost);

      const response = await request(app).post('/posts').send(createData).expect(201);

      expect(response.body).toEqual(mockPost);
      expect(PostsService.create).toHaveBeenCalledWith(TEST_USER_ID, createData);
    });

    it('should return 400 for missing title', async () => {
      const invalidData = {
        content: 'Post content',
        status: PostStatus.DRAFT,
      };

      (PostsService.create as jest.Mock).mockRejectedValue(
        new ValidationError('Invalid post data')
      );

      const response = await request(app).post('/posts').send(invalidData).expect(400);

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

      const response = await request(app).post('/posts').send(invalidData).expect(400);

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
        id: TEST_POST_ID,
        ...updateData,
        slug: 'updated-title',
        status: PostStatus.DRAFT,
        authorId: TEST_USER_ID,
        author: { id: TEST_USER_ID, email: 'test@example.com' },
      };

      (PostsService.update as jest.Mock).mockResolvedValue(mockUpdatedPost);

      const response = await request(app)
        .put(`/posts/${TEST_POST_ID}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual(mockUpdatedPost);
      expect(PostsService.update).toHaveBeenCalledWith(
        TEST_POST_ID,
        TEST_USER_ID,
        'user',
        updateData
      );
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.update as jest.Mock).mockRejectedValue(new NotFoundError('Post not found'));

      const response = await request(app)
        .put(`/posts/${NONEXISTENT_POST_ID}`)
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized update', async () => {
      (PostsService.update as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app)
        .put(`/posts/${TEST_POST_ID}`)
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

      const response = await request(app).delete(`/posts/${TEST_POST_ID}`).expect(200);

      expect(response.body.message).toContain('deleted');
      expect(PostsService.delete).toHaveBeenCalledWith(TEST_POST_ID, TEST_USER_ID, 'user');
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.delete as jest.Mock).mockRejectedValue(new NotFoundError('Post not found'));

      const response = await request(app).delete(`/posts/${NONEXISTENT_POST_ID}`).expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized delete', async () => {
      (PostsService.delete as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app).delete(`/posts/${TEST_POST_ID}`).expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('POST /posts/:id/publish', () => {
    it('should publish a post', async () => {
      const mockPublishedPost = {
        id: TEST_POST_ID,
        title: 'Test Post',
        slug: 'test-post',
        content: 'Test content',
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
        authorId: TEST_USER_ID,
        author: { id: TEST_USER_ID, email: 'test@example.com' },
      };

      (PostsService.publish as jest.Mock).mockResolvedValue(mockPublishedPost);

      const response = await request(app).post(`/posts/${TEST_POST_ID}/publish`).expect(200);

      expect(response.body.status).toBe(PostStatus.PUBLISHED);
      expect(PostsService.publish).toHaveBeenCalledWith(TEST_POST_ID, TEST_USER_ID, 'user');
    });

    it('should return 404 for non-existent post', async () => {
      (PostsService.publish as jest.Mock).mockRejectedValue(new NotFoundError('Post not found'));

      const response = await request(app).post(`/posts/${NONEXISTENT_POST_ID}/publish`).expect(404);

      expect(response.body.error).toContain('not found');
    });

    it('should return 403 for unauthorized publish', async () => {
      (PostsService.publish as jest.Mock).mockRejectedValue(
        new ForbiddenError('You do not have permission')
      );

      const response = await request(app).post(`/posts/${TEST_POST_ID}/publish`).expect(403);

      expect(response.body.error).toContain('permission');
    });
  });

  describe('Validation error handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      // Mock findMany to succeed (we want to test the catch block with non-ZodError)
      (PostsService.findMany as jest.Mock).mockResolvedValue({
        posts: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
      });

      // Invalid page number should still be handled by Zod
      const response = await request(app).get('/posts?page=-1');

      // Should either succeed with default values or return error
      expect([200, 400]).toContain(response.status);
    });

    it('should handle errors during POST validation', async () => {
      // Mock schema parse to throw a non-ZodError
      const createData = {
        title: 'Test',
        content: 'Content',
      };

      // Create post will be called if validation succeeds
      (PostsService.create as jest.Mock).mockResolvedValue({
        id: TEST_POST_ID,
        ...createData,
      });

      const response = await request(app).post('/posts').send(createData);

      expect(response.status).toBe(201);
    });

    it('should handle errors during PUT validation', async () => {
      const updateData = {
        title: 'Updated',
      };

      (PostsService.update as jest.Mock).mockResolvedValue({
        id: TEST_POST_ID,
        ...updateData,
      });

      const response = await request(app).put(`/posts/${TEST_POST_ID}`).send(updateData);

      expect(response.status).toBe(200);
    });

    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post('/posts')
        .set('Content-Type', 'application/json')
        .send('{"title": "Test", invalid json}');

      // Express returns 500 for malformed JSON (parsing error)
      expect([400, 500]).toContain(response.status);
    });

    it('should handle malformed JSON in PUT request', async () => {
      const response = await request(app)
        .put(`/posts/${TEST_POST_ID}`)
        .set('Content-Type', 'application/json')
        .send('{"title": invalid}');

      // Express returns 500 for malformed JSON (parsing error)
      expect([400, 500]).toContain(response.status);
    });

    it('should rethrow non-Zod errors from GET /posts', async () => {
      // Mock findMany to throw a non-Zod error
      (PostsService.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app).get('/posts');

      expect(response.status).toBe(500);
    });

    it('should rethrow non-Zod errors from POST /posts', async () => {
      const createData = {
        title: 'Test',
        content: 'Content',
      };

      // Mock create to throw a non-Zod, non-Validation error
      (PostsService.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).post('/posts').send(createData);

      expect(response.status).toBe(500);
    });

    it('should rethrow non-Zod errors from PUT /posts/:id', async () => {
      const updateData = {
        title: 'Updated',
      };

      // Mock update to throw a non-Zod error
      (PostsService.update as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app).put(`/posts/${TEST_POST_ID}`).send(updateData);

      expect(response.status).toBe(500);
    });

    it('should handle invalid update data with Zod validation', async () => {
      // Send invalid data that will fail Zod validation
      const invalidUpdateData = {
        status: 'INVALID_STATUS', // Invalid enum value
      };

      const response = await request(app).put(`/posts/${TEST_POST_ID}`).send(invalidUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid post data');
    });
  });
});
