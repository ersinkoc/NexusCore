import { randomBytes } from 'crypto';
import { Request } from 'express';

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
import { SanitizationService, AuditService } from '../../shared/services';
import { AuditAction } from '../../shared/services/audit.service';

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
  static async create(userId: string, input: CreatePostInput, req?: Request) {
    // Sanitize user input to prevent XSS attacks
    const sanitizedTitle = SanitizationService.sanitizeText(input.title);
    const sanitizedContent = SanitizationService.sanitizeHtml(input.content);
    const sanitizedExcerpt = input.excerpt
      ? SanitizationService.sanitizeText(input.excerpt)
      : undefined;
    const sanitizedMetaTitle = input.metaTitle
      ? SanitizationService.sanitizeText(input.metaTitle)
      : undefined;
    const sanitizedMetaDescription = input.metaDescription
      ? SanitizationService.sanitizeText(input.metaDescription)
      : undefined;

    const baseSlug = generateSlug(sanitizedTitle);

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
            title: sanitizedTitle,
            content: sanitizedContent,
            excerpt: sanitizedExcerpt,
            metaTitle: sanitizedMetaTitle,
            metaDescription: sanitizedMetaDescription,
            status: input.status,
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

        // Log audit event
        await AuditService.log({
          userId,
          action: AuditAction.POST_CREATED,
          entity: 'post',
          entityId: post.id,
          metadata: {
            title: post.title,
            status: post.status,
            slug: post.slug,
          },
          req,
        });

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
  static async update(
    id: string,
    userId: string,
    userRole: string,
    input: UpdatePostInput,
    req?: Request
  ) {
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

    // Sanitize user input to prevent XSS attacks
    const sanitizedData: UpdatePostInput = {};
    if (input.title !== undefined) {
      sanitizedData.title = SanitizationService.sanitizeText(input.title);
    }
    if (input.content !== undefined) {
      sanitizedData.content = SanitizationService.sanitizeHtml(input.content);
    }
    if (input.excerpt !== undefined) {
      sanitizedData.excerpt = SanitizationService.sanitizeText(input.excerpt);
    }
    if (input.metaTitle !== undefined) {
      sanitizedData.metaTitle = SanitizationService.sanitizeText(input.metaTitle);
    }
    if (input.metaDescription !== undefined) {
      sanitizedData.metaDescription = SanitizationService.sanitizeText(input.metaDescription);
    }
    if (input.status !== undefined) {
      sanitizedData.status = input.status;
    }
    if (input.publishedAt !== undefined) {
      sanitizedData.publishedAt = input.publishedAt;
    }

    const updated = await prisma.post.update({
      where: { id },
      data: sanitizedData,
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

    // Log audit event
    await AuditService.log({
      userId,
      action: AuditAction.POST_UPDATED,
      entity: 'post',
      entityId: id,
      metadata: {
        title: updated.title,
        status: updated.status,
        changedFields: Object.keys(sanitizedData),
      },
      req,
    });

    eventBus.emit('post.updated', { post: updated, userId });

    return updated;
  }

  /**
   * Delete post
   */
  static async delete(id: string, userId: string, userRole: string, req?: Request) {
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

    // Log audit event
    await AuditService.log({
      userId,
      action: AuditAction.POST_DELETED,
      entity: 'post',
      entityId: id,
      metadata: {
        title: post.title,
        status: post.status,
      },
      req,
    });

    eventBus.emit('post.deleted', { postId: id, userId });

    return { message: 'Post deleted successfully' };
  }

  /**
   * Publish post
   */
  static async publish(id: string, userId: string, userRole: string, req?: Request) {
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

    // Log audit event
    await AuditService.log({
      userId,
      action: AuditAction.POST_PUBLISHED,
      entity: 'post',
      entityId: id,
      metadata: {
        title: updated.title,
        publishedAt: updated.publishedAt,
      },
      req,
    });

    eventBus.emit('post.published', { post: updated, userId });

    return updated;
  }
}
