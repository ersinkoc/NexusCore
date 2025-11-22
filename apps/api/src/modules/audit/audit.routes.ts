import { Router } from 'express';

import { AuditController } from './audit.controller';
import { requireAuth } from '../auth/auth.middleware';

const router: Router = Router();
const auditController = new AuditController();

/**
 * Audit Routes
 * Base path: /api/audit
 * All routes require authentication
 */

/**
 * @swagger
 * /audit/me:
 *   get:
 *     summary: Get current user's audit trail
 *     description: Retrieve audit logs for the authenticated user
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', requireAuth, auditController.me);

/**
 * @swagger
 * /audit/user/{userId}:
 *   get:
 *     summary: Get user's audit trail
 *     description: Retrieve audit logs for a specific user (admin only or own logs)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/user/:userId', requireAuth, auditController.getUserLogs);

/**
 * @swagger
 * /audit/entity/{entity}/{entityId}:
 *   get:
 *     summary: Get entity audit trail
 *     description: Retrieve audit logs for a specific entity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Audit logs retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/entity/:entity/:entityId', requireAuth, auditController.getEntityLogs);

/**
 * @swagger
 * /audit/security:
 *   get:
 *     summary: Get security events
 *     description: Retrieve security-related audit logs (admin only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Security events retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.get('/security', requireAuth, auditController.getSecurityEvents);

export default router;
