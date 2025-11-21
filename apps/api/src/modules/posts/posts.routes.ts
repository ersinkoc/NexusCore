import { Router, Request, Response } from 'express';
import { PostsService } from './posts.service';
import { requireAuth, AuthenticatedRequest } from '../auth/auth.middleware';
import {
  createPostSchema,
  updatePostSchema,
  queryPostsSchema,
  postIdParamSchema,
  postSlugParamSchema,
} from '@nexuscore/types';
import { asyncHandler } from '../../shared/utils/async-handler';

const router: Router = Router();

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
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const query = queryPostsSchema.parse(req.query);
    const result = await PostsService.findMany(query);
    res.json(result);
  })
);

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
router.get(
  '/slug/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate slug parameter
    const { slug } = postSlugParamSchema.parse(req.params);
    const post = await PostsService.findBySlug(slug);
    res.json(post);
  })
);

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
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // req.user guaranteed to exist by requireAuth middleware
    const data = createPostSchema.parse(req.body);
    const post = await PostsService.create(req.user!.userId, data);
    res.status(201).json(post);
  })
);

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
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    // Validate post ID parameter
    const { id } = postIdParamSchema.parse(req.params);
    const post = await PostsService.findById(id);
    res.json(post);
  })
);

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
router.put(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // req.user guaranteed to exist by requireAuth middleware
    // Validate post ID parameter
    const { id } = postIdParamSchema.parse(req.params);
    const data = updatePostSchema.parse(req.body);
    const post = await PostsService.update(id, req.user!.userId, req.user!.role, data);
    res.json(post);
  })
);

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
router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // req.user guaranteed to exist by requireAuth middleware
    // Validate post ID parameter
    const { id } = postIdParamSchema.parse(req.params);
    const result = await PostsService.delete(id, req.user!.userId, req.user!.role);
    res.json(result);
  })
);

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
router.post(
  '/:id/publish',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // req.user guaranteed to exist by requireAuth middleware
    // Validate post ID parameter
    const { id } = postIdParamSchema.parse(req.params);
    const post = await PostsService.publish(id, req.user!.userId, req.user!.role);
    res.json(post);
  })
);

export default router;
