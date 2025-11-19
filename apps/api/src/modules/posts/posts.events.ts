import { EventHandler } from '../../core/event-bus';
import { logger } from '../../core/logger';
import { prisma } from '@nexuscore/db';

/**
 * Handle post created event
 */
const onPostCreated: EventHandler<'post.created'> = async (payload) => {
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
const onPostUpdated: EventHandler<'post.updated'> = async (payload) => {
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
const onPostPublished: EventHandler<'post.published'> = async (payload) => {
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
const onPostDeleted: EventHandler<'post.deleted'> = async (payload) => {
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

export const PostEventHandlers = {
  'post.created': onPostCreated,
  'post.updated': onPostUpdated,
  'post.published': onPostPublished,
  'post.deleted': onPostDeleted,
};
