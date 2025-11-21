import { Request, Response, NextFunction } from 'express';

import { AuthenticatedRequest, UserRole } from '@nexuscore/types';

import { UnauthorizedError, ForbiddenError } from '../../core/errors';
import { JWTService } from '../../shared/services';
import { logger } from '../../core/logger';

// Re-export types for convenience
export type { AuthenticatedRequest };

/**
 * Authentication Middleware
 * Verifies JWT access token and attaches user to request
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = JWTService.verifyAccessToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = payload;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * RBAC Middleware Factory
 * Requires user to have one of the specified roles
 *
 * @param roles - Array of allowed roles
 * @returns Express middleware
 *
 * @example
 * router.get('/admin', requireAuth, requireRole(['admin']), handler);
 */
export function requireRole(roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = (req as AuthenticatedRequest).user;

      if (!user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!roles.includes(user.role)) {
        throw new ForbiddenError(
          `Access denied. Required roles: ${roles.join(', ')}`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't fail if not
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = JWTService.verifyAccessToken(token);
      (req as AuthenticatedRequest).user = payload;
    }
  } catch (error) {
    // Log token verification errors for security monitoring
    // but continue without user (optional auth)
    if (error instanceof Error) {
      logger.warn('Invalid token in optional auth', {
        error: error.message,
        path: req.path,
      });
    }
  }

  next();
}
