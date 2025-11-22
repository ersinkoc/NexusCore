import 'express-async-errors';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import auditRoutes from '../audit.routes';
import { AuditService } from '../../../shared/services';
import { UserRole } from '@nexuscore/types';
import { ForbiddenError } from '../../../core/errors';

// Mock dependencies
jest.mock('@nexuscore/db', () => ({
  prisma: {
    user: {},
  },
}));

jest.mock('../../../shared/services', () => ({
  AuditService: {
    getUserLogs: jest.fn(),
    getEntityLogs: jest.fn(),
    getSecurityEvents: jest.fn(),
  },
}));

jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

// Create a mutable mock user that can be updated per test
let mockAuthUser: any = null;

// Mock auth middleware
jest.mock('../../auth/auth.middleware', () => ({
  requireAuth: (_req: any, res: any, next: any) => {
    // If no mock user is set, return 401
    if (!mockAuthUser) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Unauthorized',
          statusCode: 401,
        },
      });
    }
    // Mock user for authenticated requests
    _req.user = mockAuthUser;
    next();
  },
}));

describe('Audit Routes Integration Tests', () => {
  let app: Express;

  const mockUserAuth = {
    userId: 'user-123',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockAdminAuth = {
    userId: 'admin-123',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockAuditLogs = [
    {
      id: 'log-1',
      userId: 'user-123',
      action: 'AUTH_LOGIN',
      entity: 'user',
      entityId: 'user-123',
      details: {
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      },
      createdAt: '2025-11-21T10:00:00.000Z',
    },
    {
      id: 'log-2',
      userId: 'user-123',
      action: 'POST_CREATE',
      entity: 'post',
      entityId: 'post-123',
      details: {
        title: 'My First Post',
      },
      createdAt: '2025-11-21T11:00:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock user to regular user by default
    mockAuthUser = { ...mockUserAuth };

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/audit', auditRoutes);

    // Global error handler
    app.use(
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof ForbiddenError) {
          return res.status(403).json({
            success: false,
            error: {
              message: err.message,
              statusCode: 403,
            },
          });
        }
        return res.status(500).json({
          success: false,
          error: {
            message: 'Internal server error',
            statusCode: 500,
          },
        });
      }
    );
  });

  describe('GET /audit/me', () => {
    it('should return current user audit logs', async () => {
      (AuditService.getUserLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const response = await request(app)
        .get('/audit/me')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockAuditLogs);
      expect(response.body.data.count).toBe(2);
      expect(AuditService.getUserLogs).toHaveBeenCalledWith('user-123', 100);
    });

    it('should respect limit query parameter', async () => {
      (AuditService.getUserLogs as jest.Mock).mockResolvedValue(mockAuditLogs.slice(0, 1));

      const response = await request(app)
        .get('/audit/me?limit=50')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(AuditService.getUserLogs).toHaveBeenCalledWith('user-123', 50);
    });

    it('should require authentication', async () => {
      mockAuthUser = null;
      await request(app).get('/audit/me').expect(401);
    });
  });

  describe('GET /audit/user/:userId', () => {
    it('should allow users to view their own logs', async () => {
      (AuditService.getUserLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const response = await request(app)
        .get('/audit/user/user-123')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockAuditLogs);
      expect(AuditService.getUserLogs).toHaveBeenCalledWith('user-123', 100);
    });

    it('should allow admins to view any user logs', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getUserLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      const response = await request(app)
        .get('/audit/user/user-123')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockAuditLogs);
      expect(AuditService.getUserLogs).toHaveBeenCalledWith('user-123', 100);
    });

    it('should forbid non-admins from viewing other users logs', async () => {
      const response = await request(app)
        .get('/audit/user/other-user-456')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('permission');
    });

    it('should respect limit query parameter', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getUserLogs as jest.Mock).mockResolvedValue(mockAuditLogs);

      await request(app)
        .get('/audit/user/user-123?limit=25')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(AuditService.getUserLogs).toHaveBeenCalledWith('user-123', 25);
    });
  });

  describe('GET /audit/entity/:entity/:entityId', () => {
    const mockEntityLogs = [
      {
        id: 'log-1',
        userId: 'user-123',
        action: 'POST_CREATE',
        entity: 'post',
        entityId: 'post-123',
        details: { title: 'Original Title' },
        createdAt: '2025-11-21T10:00:00.000Z',
      },
      {
        id: 'log-2',
        userId: 'user-456',
        action: 'POST_UPDATE',
        entity: 'post',
        entityId: 'post-123',
        details: { title: 'Updated Title' },
        createdAt: '2025-11-21T11:00:00.000Z',
      },
      {
        id: 'log-3',
        userId: null,
        action: 'POST_VIEW',
        entity: 'post',
        entityId: 'post-123',
        details: {},
        createdAt: '2025-11-21T12:00:00.000Z',
      },
    ];

    it('should return all entity logs for admins', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getEntityLogs as jest.Mock).mockResolvedValue(mockEntityLogs);

      const response = await request(app)
        .get('/audit/entity/post/post-123')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockEntityLogs);
      expect(response.body.data.count).toBe(3);
      expect(AuditService.getEntityLogs).toHaveBeenCalledWith('post', 'post-123', 100);
    });

    it('should filter entity logs for non-admins', async () => {
      (AuditService.getEntityLogs as jest.Mock).mockResolvedValue(mockEntityLogs);

      const response = await request(app)
        .get('/audit/entity/post/post-123')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      // Should only include logs from the user or public logs (userId: null)
      expect(response.body.data.logs).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.logs[0].userId).toBe('user-123');
      expect(response.body.data.logs[1].userId).toBeNull();
    });

    it('should respect limit query parameter', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getEntityLogs as jest.Mock).mockResolvedValue(mockEntityLogs);

      await request(app)
        .get('/audit/entity/post/post-123?limit=10')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(AuditService.getEntityLogs).toHaveBeenCalledWith('post', 'post-123', 10);
    });
  });

  describe('GET /audit/security', () => {
    const mockSecurityLogs = [
      {
        id: 'log-1',
        userId: 'user-123',
        action: 'ACCOUNT_LOCKED',
        entity: 'user',
        entityId: 'user-123',
        details: {
          reason: 'Too many failed login attempts',
          attempts: 5,
          lockDuration: '15 minutes',
        },
        createdAt: '2025-11-21T10:00:00.000Z',
      },
      {
        id: 'log-2',
        userId: null,
        action: 'AUTH_FAILED',
        entity: 'auth',
        entityId: null,
        details: {
          email: 'attacker@example.com',
          ip: '192.168.1.100',
          reason: 'Invalid credentials',
        },
        createdAt: '2025-11-21T10:05:00.000Z',
      },
    ];

    it('should return security events for admins', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getSecurityEvents as jest.Mock).mockResolvedValue(mockSecurityLogs);

      const response = await request(app)
        .get('/audit/security')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toEqual(mockSecurityLogs);
      expect(response.body.data.count).toBe(2);
      expect(AuditService.getSecurityEvents).toHaveBeenCalledWith(100);
    });

    it('should forbid non-admins from viewing security events', async () => {
      const response = await request(app)
        .get('/audit/security')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('permission');
    });

    it('should respect limit query parameter', async () => {
      mockAuthUser = { ...mockAdminAuth };
      (AuditService.getSecurityEvents as jest.Mock).mockResolvedValue(mockSecurityLogs);

      await request(app)
        .get('/audit/security?limit=50')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(AuditService.getSecurityEvents).toHaveBeenCalledWith(50);
    });

    it('should require authentication', async () => {
      mockAuthUser = null;
      await request(app).get('/audit/security').expect(401);
    });
  });
});
