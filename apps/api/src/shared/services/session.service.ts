import { prisma } from '@nexuscore/db';
import { Request } from 'express';

import { logger } from '../../core/logger';

/**
 * Session Service
 * Manages user session lifecycle and tracking
 */
export class SessionService {
  /**
   * Create a new session on login
   */
  static async createSession(userId: string, req: Request): Promise<{ sessionId: string }> {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = this.getClientIp(req);

    const session = await prisma.session.create({
      data: {
        userId,
        userAgent,
        ipAddress,
        lastActiveAt: new Date(),
      },
    });

    logger.info('Session created', {
      sessionId: session.id,
      userId,
      ipAddress,
    });

    return { sessionId: session.id };
  }

  /**
   * Update session activity timestamp
   */
  static async updateActivity(sessionId: string): Promise<void> {
    try {
      await prisma.session.update({
        where: { id: sessionId },
        data: { lastActiveAt: new Date() },
      });
    } catch (error) {
      // Session might have been deleted - log but don't throw
      logger.warn('Failed to update session activity', { sessionId, error });
    }
  }

  /**
   * Delete a specific session (logout)
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const deleted = await prisma.session.deleteMany({
      where: { id: sessionId },
    });

    if (deleted.count > 0) {
      logger.info('Session deleted', { sessionId });
    }
  }

  /**
   * Delete all sessions for a user (logout all devices)
   */
  static async deleteAllUserSessions(userId: string): Promise<number> {
    const deleted = await prisma.session.deleteMany({
      where: { userId },
    });

    logger.info('All user sessions deleted', { userId, count: deleted.count });

    return deleted.count;
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId },
      orderBy: { lastActiveAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Cleanup inactive sessions (older than 30 days)
   */
  static async cleanupInactiveSessions(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deleted = await prisma.session.deleteMany({
      where: {
        lastActiveAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    if (deleted.count > 0) {
      logger.info('Cleaned up inactive sessions', { count: deleted.count });
    }

    return deleted.count;
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIp(req: Request): string {
    // Check for proxy headers first
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',').map((ip) => ip.trim());
      return ips[0]; // First IP is the client
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    // Fallback to socket address
    return req.socket.remoteAddress || 'Unknown';
  }
}
