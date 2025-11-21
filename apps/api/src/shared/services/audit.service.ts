import { prisma } from '@nexuscore/db';
import { Request } from 'express';

import { logger } from '../../core/logger';
import { sanitizeForLogging } from '../utils';

/**
 * Audit actions for security-sensitive operations
 */
export enum AuditAction {
  // User actions
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  USER_ROLE_CHANGED = 'user.role_changed',
  USER_DEACTIVATED = 'user.deactivated',
  USER_ACTIVATED = 'user.activated',

  // Authentication actions
  AUTH_LOGIN_SUCCESS = 'auth.login.success',
  AUTH_LOGIN_FAILED = 'auth.login.failed',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGOUT_ALL = 'auth.logout_all',
  AUTH_TOKEN_REFRESHED = 'auth.token_refreshed',
  AUTH_PASSWORD_CHANGED = 'auth.password_changed',

  // Post actions
  POST_CREATED = 'post.created',
  POST_UPDATED = 'post.updated',
  POST_DELETED = 'post.deleted',
  POST_PUBLISHED = 'post.published',

  // Security events
  SECURITY_ACCOUNT_LOCKED = 'security.account_locked',
  SECURITY_CSRF_VIOLATION = 'security.csrf_violation',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
}

/**
 * Audit Log Entry Interface
 */
export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  metadata?: Record<string, any>;
  req?: Request;
}

/**
 * Audit Service
 * Logs security-sensitive operations for compliance and investigation
 */
export class AuditService {
  /**
   * Log an audit event
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      const ipAddress = entry.req ? this.getClientIp(entry.req) : undefined;
      const userAgent = entry.req?.headers['user-agent'] || undefined;

      // Sanitize metadata to prevent sensitive data in audit logs
      const sanitizedMetadata = entry.metadata ? sanitizeForLogging(entry.metadata) : undefined;

      await prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          metadata: sanitizedMetadata,
          ipAddress,
          userAgent,
        },
      });

      logger.info('Audit log created', {
        action: entry.action,
        entity: entry.entity,
        userId: entry.userId,
      });
    } catch (error) {
      // Don't throw errors from audit logging - log and continue
      logger.error('Failed to create audit log', {
        error,
        action: entry.action,
        entity: entry.entity,
      });
    }
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserLogs(userId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getEntityLogs(entity: string, entityId: string, limit: number = 100) {
    return prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get recent security events
   */
  static async getSecurityEvents(limit: number = 100) {
    return prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: 'security.',
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get failed login attempts for a user
   */
  static async getFailedLoginAttempts(userId: string, since: Date) {
    return prisma.auditLog.count({
      where: {
        userId,
        action: AuditAction.AUTH_LOGIN_FAILED,
        createdAt: {
          gte: since,
        },
      },
    });
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = (forwarded as string).split(',').map((ip) => ip.trim());
      return ips[0];
    }

    const realIp = req.headers['x-real-ip'];
    if (realIp) {
      return realIp as string;
    }

    return req.socket.remoteAddress || 'Unknown';
  }
}
