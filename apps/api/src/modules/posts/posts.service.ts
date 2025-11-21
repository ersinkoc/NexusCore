import { randomBytes } from 'crypto';

import { prisma } from '@nexuscore/db';
import {
  CreatePostInput,
  UpdatePostInput,
  QueryPostsInput,
  PostStatus,
  UserRole,
} from '@nexuscore/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors';
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
   * Create a new post with retry logic for unique constraint violations
   * Generates unique slug by appending timestamp + random suffix
   * Retries with new random suffix if collision occurs (extremely rare)
   */
  static async create(userId: string, input: CreatePostInput) {
    const baseSlug = generateSlug(input.title);

    // Prevent empty slugs
    if (!baseSlug || baseSlug.length === 0) {
      throw new ValidationError('Title must contain at least one alphanumeric character');
    }

    const maxRetries = 5; // Maximum retry attempts for unique constraint violations
    let lastError: Error | null = null;

    // Retry loop for unique constraint violations
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate unique slug with timestamp + cryptographically secure random suffix
        // This prevents race conditions where multiple requests create posts with same title simultaneously
        const randomPart = randomBytes(4).toString('hex');
        const slug = `${baseSlug}-${Date.now()}-${randomPart}`;

        // Attempt to create post with generated slug
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

        logger.info('Post created', { postId: post.id, userId, attempts: attempt + 1 });
        eventBus.emit('post.created', { post, userId });

        return post;
      } catch (error: any) {
        // Check if error is a Prisma unique constraint violation on slug
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
          lastError = error;
          logger.warn(`Slug collision detected, retrying (attempt ${attempt + 1}/${maxRetries})`, {
            baseSlug,
            userId,
          });

          // Wait a bit before retry to reduce chance of another collision
          await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          continue;
        }

        // Not a slug collision - rethrow
        throw error;
      }
    }

    // All retries exhausted - this should be extremely rare
    logger.error('Failed to create post after max retries due to slug collisions', {
      baseSlug,
      userId,
      maxRetries,
    });

    throw new ValidationError(
      'Failed to create post due to slug generation conflicts. Please try again.',
      { cause: lastError }
    );
  }

  /**
   * Get posts with pagination and filters
   */
  static async findMany(query: QueryPostsInput) {
    const { page, limit, status, authorId, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause - let TypeScript infer the type for Prisma compatibility
    const where: Record<string, unknown> = {};

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
    const post = await prisma.post
      .update({
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
      })
      .catch((error: unknown) => {
        // If post not found, Prisma throws error with code P2025
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
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
    const post = await prisma.post
      .update({
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
      })
      .catch((error: unknown) => {
        // If post not found, Prisma throws error with code P2025
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
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

    // Only set publishedAt if it's the first time publishing (preserve original date on re-publish)
    const publishData: { status: PostStatus; publishedAt?: Date } = {
      status: PostStatus.PUBLISHED,
    };

    if (!post.publishedAt) {
      publishData.publishedAt = new Date();
    }

    const updated = await prisma.post.update({
      where: { id },
      data: publishData,
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
