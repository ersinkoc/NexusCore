import { Request, Response } from 'express';

import { AuthenticatedRequest } from '@nexuscore/types';
import { UserRole } from '@nexuscore/types';

import { asyncHandler } from '../../shared/utils';
import { AuditService } from '../../shared/services';
import { ForbiddenError } from '../../core/errors';

/**
 * Audit Controller
 * Handles HTTP requests for audit log viewing
 */
export class AuditController {
  /**
   * Get current user's audit trail
   * GET /api/audit/me
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await AuditService.getUserLogs(user!.userId, limit);

    res.status(200).json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  });

  /**
   * Get specific user's audit trail (admin only)
   * GET /api/audit/user/:userId
   */
  getUserLogs = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    // Only admins can view other users' logs
    if (user!.role !== UserRole.ADMIN && user!.userId !== userId) {
      throw new ForbiddenError('You do not have permission to view these audit logs');
    }

    const logs = await AuditService.getUserLogs(userId, limit);

    res.status(200).json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  });

  /**
   * Get entity audit trail (requires ownership or admin)
   * GET /api/audit/entity/:entity/:entityId
   */
  getEntityLogs = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const { entity, entityId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const logs = await AuditService.getEntityLogs(entity, entityId, limit);

    // For non-admins, only return logs for their own actions or public data
    const filteredLogs =
      user!.role === UserRole.ADMIN
        ? logs
        : logs.filter((log: any) => log.userId === user!.userId || !log.userId);

    res.status(200).json({
      success: true,
      data: {
        logs: filteredLogs,
        count: filteredLogs.length,
      },
    });
  });

  /**
   * Get security events (admin only)
   * GET /api/audit/security
   */
  getSecurityEvents = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;
    const limit = parseInt(req.query.limit as string) || 100;

    // Only admins can view security events
    if (user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('You do not have permission to view security events');
    }

    const logs = await AuditService.getSecurityEvents(limit);

    res.status(200).json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  });
}
