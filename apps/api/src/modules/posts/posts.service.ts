import { prisma } from '@nexuscore/db';
import {
  CreatePostInput,
  UpdatePostInput,
  QueryPostsInput,
  PostStatus,
  UserRole,
} from '@nexuscore/types';
import { NotFoundError, ForbiddenError } from '../../core/errors';
import { eventBus } from '../../core/event-bus';
import { logger } from '../../core/logger';

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

export class PostsService {
  /**
   * Create a new post
   * Generates unique slug by appending timestamp if slug already exists
   */
  static async create(userId: string, input: CreatePostInput) {
    let slug = generateSlug(input.title);

    // Check if slug already exists and make it unique if needed
    const existing = await prisma.post.findUnique({
      where: { slug },
    });

    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    // Create post with unique slug
    const post = await prisma.post.create({
      data: {
        ...input,
        slug,
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

    logger.info('Post created', { postId: post.id, userId });
    eventBus.emit('post.created', { post, userId });

    return post;
  }

  /**
   * Get posts with pagination and filters
   */
  static async findMany(query: QueryPostsInput) {
    const { page, limit, status, authorId, search } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (authorId) {
      where.authorId = authorId;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get post by ID
   * Note: Uses atomic update to increment view count without race conditions
   */
  static async findById(id: string) {
    // Atomic increment and return updated post in single query
    const post = await prisma.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
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
    }).catch((error: any) => {
      // If post not found, Prisma throws error
      if (error.code === 'P2025') {
        throw new NotFoundError('Post not found');
      }
      throw error;
    });

    return post;
  }

  /**
   * Get post by slug
   * Note: Uses atomic update to increment view count without race conditions
   */
  static async findBySlug(slug: string) {
    // Atomic increment and return updated post in single query
    const post = await prisma.post.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
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
    }).catch((error: any) => {
      // If post not found, Prisma throws error
      if (error.code === 'P2025') {
        throw new NotFoundError('Post not found');
      }
      throw error;
    });

    return post;
  }

  /**
   * Update post
   */
  static async update(id: string, userId: string, userRole: string, input: UpdatePostInput) {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check permissions: only author or admin can update
    if (post.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to update this post');
    }

    const updated = await prisma.post.update({
      where: { id },
      data: input,
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

    logger.info('Post updated', { postId: id, userId });
    eventBus.emit('post.updated', { post: updated, userId });

    return updated;
  }

  /**
   * Delete post
   */
  static async delete(id: string, userId: string, userRole: string) {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check permissions: only author or admin can delete
    if (post.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to delete this post');
    }

    await prisma.post.delete({
      where: { id },
    });

    logger.info('Post deleted', { postId: id, userId });
    eventBus.emit('post.deleted', { postId: id, userId });

    return { message: 'Post deleted successfully' };
  }

  /**
   * Publish post
   */
  static async publish(id: string, userId: string, userRole: string) {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (post.authorId !== userId && userRole !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to publish this post');
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        status: PostStatus.PUBLISHED,
        publishedAt: new Date(),
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

    logger.info('Post published', { postId: id, userId });
    eventBus.emit('post.published', { post: updated, userId });

    return updated;
  }
}
