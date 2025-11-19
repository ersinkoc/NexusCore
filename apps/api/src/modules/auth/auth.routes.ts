import { Router } from 'express';

import { AuthController } from './auth.controller';
import { requireAuth } from './auth.middleware';

const router: Router = Router();
const authController = new AuthController();

/**
 * Authentication Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);

// Protected routes
router.get('/me', requireAuth, authController.me);

export default router;
