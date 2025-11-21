import { Request, Response, NextFunction } from 'express';

import { ForbiddenError } from '../errors';
import { CsrfService } from '../../shared/services/csrf.service';
import { logger } from '../logger';

/**
 * CSRF Protection Middleware
 * Validates CSRF token for state-changing operations (POST, PUT, PATCH, DELETE)
 *
 * Token flow:
 * 1. Client receives CSRF token on login/register (in response body)
 * 2. Client stores token and includes it in X-CSRF-Token header for mutations
 * 3. Server validates token signature against cookie value
 */
export function requireCsrf(req: Request, _res: Response, next: NextFunction) {
  try {
    // Skip CSRF validation for safe methods (GET, HEAD, OPTIONS)
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // Get CSRF token from cookie
    const tokenFromCookie = req.cookies.csrfToken;

    // Get CSRF signature from custom header
    const signatureFromHeader = req.headers['x-csrf-token'] as string;

    // Validate token exists in both locations
    if (!tokenFromCookie || !signatureFromHeader) {
      logger.warn('CSRF validation failed: Missing token or signature', {
        method: req.method,
        path: req.path,
        hasToken: !!tokenFromCookie,
        hasSignature: !!signatureFromHeader,
      });
      throw new ForbiddenError('CSRF token missing');
    }

    // Verify token signature
    const isValid = CsrfService.verifyToken(tokenFromCookie, signatureFromHeader);

    if (!isValid) {
      logger.warn('CSRF validation failed: Invalid token signature', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      throw new ForbiddenError('Invalid CSRF token');
    }

    // Token valid, proceed
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional CSRF Middleware
 * Validates CSRF token if present, but doesn't fail if missing
 * Useful for endpoints that support both authenticated and unauthenticated access
 */
export function optionalCsrf(req: Request, _res: Response, next: NextFunction) {
  try {
    const tokenFromCookie = req.cookies.csrfToken;
    const signatureFromHeader = req.headers['x-csrf-token'] as string;

    // If both present, validate them
    if (tokenFromCookie && signatureFromHeader) {
      const isValid = CsrfService.verifyToken(tokenFromCookie, signatureFromHeader);
      if (!isValid) {
        logger.warn('Optional CSRF validation failed: Invalid token signature', {
          method: req.method,
          path: req.path,
        });
        throw new ForbiddenError('Invalid CSRF token');
      }
    }

    // If missing or valid, continue
    next();
  } catch (error) {
    next(error);
  }
}
