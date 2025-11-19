import { EventHandler } from '@nexuscore/types';
import { logger } from '../../core/logger';
import { prisma } from '@nexuscore/db';

/**
 * Handle post created event
 */
const onPostCreated: EventHandler<'post.created'> = async (payload: any) => {
  const { post, userId } = payload;

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'CREATE',
      entity: 'POST',
      entityId: post.id,
      metadata: {
        title: post.title,
        status: post.status,
      },
    },
  });

  logger.info('Post created event handled', { postId: post.id });
};

/**
 * Handle post updated event
 */
const onPostUpdated: EventHandler<'post.updated'> = async (payload: any) => {
  const { post, userId } = payload;

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'UPDATE',
      entity: 'POST',
      entityId: post.id,
      metadata: {
        title: post.title,
        status: post.status,
      },
    },
  });

  logger.info('Post updated event handled', { postId: post.id });
};

/**
 * Handle post published event
 */
const onPostPublished: EventHandler<'post.published'> = async (payload: any) => {
  const { post, userId } = payload;

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PUBLISH',
      entity: 'POST',
      entityId: post.id,
      metadata: {
        title: post.title,
        publishedAt: post.publishedAt,
      },
    },
  });

  logger.info('Post published event handled', { postId: post.id });

  // Here you could trigger other actions:
  // - Send notification to subscribers
  // - Invalidate cache
  // - Generate sitemap
  // - Send to search index
};

/**
 * Handle post deleted event
 */
const onPostDeleted: EventHandler<'post.deleted'> = async (payload: any) => {
  const { postId, userId } = payload;

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId,
      action: 'DELETE',
      entity: 'POST',
      entityId: postId,
      metadata: {
        deletedAt: new Date().toISOString(),
      },
    },
  });

  logger.info('Post deleted event handled', { postId });
};

/**
 * Export all event handlers
 * Wrapped to match IModule events signature
 */
export const PostEventHandlers: Record<string, (...args: unknown[]) => void | Promise<void>> = {
  'post.created': (...args: unknown[]) => onPostCreated(args[0] as any),
  'post.updated': (...args: unknown[]) => onPostUpdated(args[0] as any),
  'post.published': (...args: unknown[]) => onPostPublished(args[0] as any),
  'post.deleted': (...args: unknown[]) => onPostDeleted(args[0] as any),
};
