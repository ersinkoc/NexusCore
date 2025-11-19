import { Router, Request, Response } from 'express';
import { PostsService } from './posts.service';
import { requireAuth, AuthenticatedRequest } from '../auth/auth.middleware';
import { createPostSchema, updatePostSchema, queryPostsSchema } from '@nexuscore/types';
import { ValidationError } from '../../core/errors';

const router = Router();

/**
 * @swagger
 * /posts:
 *   get:
 *     summary: Get all posts
 *     description: Retrieve posts with pagination and optional filters
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *       - in: query
 *         name: authorId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = queryPostsSchema.parse(req.query);
    const result = await PostsService.findMany(query);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw new ValidationError('Invalid query parameters', error);
    }
    throw error;
  }
});

/**
 * @swagger
 * /posts/slug/{slug}:
 *   get:
 *     summary: Get post by slug
 *     description: Retrieve a single post by its slug
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 */
router.get('/slug/:slug', async (req: Request, res: Response) => {
  const post = await PostsService.findBySlug(req.params.slug);
  res.json(post);
});

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post (requires authentication)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               excerpt:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *     responses:
 *       201:
 *         description: Post created successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createPostSchema.parse(req.body);
    const post = await PostsService.create(req.user!.userId, data);
    res.status(201).json(post);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw new ValidationError('Invalid post data', error);
    }
    throw error;
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve a single post by its ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *       404:
 *         description: Post not found
 */
router.get('/:id', async (req: Request, res: Response) => {
  const post = await PostsService.findById(req.params.id);
  res.json(post);
});

/**
 * @swagger
 * /posts/{id}:
 *   put:
 *     summary: Update post
 *     description: Update a post (requires authentication and ownership)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *     responses:
 *       200:
 *         description: Post updated successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = updatePostSchema.parse(req.body);
    const post = await PostsService.update(
      req.params.id,
      req.user!.userId,
      req.user!.role,
      data
    );
    res.json(post);
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      throw new ValidationError('Invalid post data', error);
    }
    throw error;
  }
});

/**
 * @swagger
 * /posts/{id}:
 *   delete:
 *     summary: Delete post
 *     description: Delete a post (requires authentication and ownership)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const result = await PostsService.delete(req.params.id, req.user!.userId, req.user!.role);
  res.json(result);
});

/**
 * @swagger
 * /posts/{id}/publish:
 *   post:
 *     summary: Publish post
 *     description: Publish a draft post (requires authentication and ownership)
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Post published successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Post not found
 */
router.post('/:id/publish', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const post = await PostsService.publish(req.params.id, req.user!.userId, req.user!.role);
  res.json(post);
});

export default router;
