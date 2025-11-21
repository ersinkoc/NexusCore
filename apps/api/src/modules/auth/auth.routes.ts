import { Router, Request, Response, NextFunction } from 'express';

import { AuthController } from './auth.controller';
import { requireAuth } from './auth.middleware';

const router: Router = Router();
const authController = new AuthController();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Get auth rate limiter from app settings (configured in app.ts)
const getAuthLimiter = (req: Request, _res: Response, next: NextFunction) => {
  const authLimiter = req.app.get('authLimiter');
  if (authLimiter) {
    return authLimiter(req, _res, next);
  }
  next();
};

// Public routes with stricter rate limiting
router.post('/register', getAuthLimiter, authController.register);
router.post('/login', getAuthLimiter, authController.login);
router.post('/logout', requireAuth, authController.logout); // Fixed: Now requires authentication
router.post('/refresh', getAuthLimiter, authController.refresh); // Fixed: Add rate limiting to prevent refresh token brute force

// Protected routes
router.get('/me', requireAuth, authController.me);
router.post('/logout-all', requireAuth, authController.logoutAll);

export default router;
