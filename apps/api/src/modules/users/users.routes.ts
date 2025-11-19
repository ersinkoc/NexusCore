import { Router } from 'express';

import { UserRole } from '@nexuscore/types';

import { requireAuth, requireRole } from '../auth/auth.middleware';
import { UsersController } from './users.controller';

const router: Router = Router();
const usersController = new UsersController();

/**
 * Users Routes
 * Base path: /api/users
 *
 * All routes require authentication
 * Admin/Moderator routes require specific roles
 */

// Get all users (Admin/Moderator only)
router.get(
  '/',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  usersController.getUsers
);

// Get user by ID (Authenticated users)
router.get('/:id', requireAuth, usersController.getUserById);

// Update user (Admin only)
router.patch('/:id', requireAuth, requireRole([UserRole.ADMIN]), usersController.updateUser);

// Delete user (Admin only)
router.delete('/:id', requireAuth, requireRole([UserRole.ADMIN]), usersController.deleteUser);

// Deactivate user (Admin/Moderator)
router.post(
  '/:id/deactivate',
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.MODERATOR]),
  usersController.deactivateUser
);

export default router;
