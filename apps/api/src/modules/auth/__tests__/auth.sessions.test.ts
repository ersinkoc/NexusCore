import 'express-async-errors';
import request from 'supertest';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../auth.routes';
import { SessionService } from '../../../shared/services';
import { UserRole } from '@nexuscore/types';
import { UnauthorizedError, NotFoundError } from '../../../core/errors';
import { JWTService } from '../../../shared/services';
import { prisma } from '@nexuscore/db';

// Mock dependencies
jest.mock('@nexuscore/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../shared/services', () => ({
  JWTService: {
    verifyAccessToken: jest.fn(),
  },
  SessionService: {
    getUserSessions: jest.fn(),
    deleteSession: jest.fn(),
  },
}));

jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Session Management Tests', () => {
  let app: Express;

  const mockUserAuth = {
    userId: 'user-123',
    email: 'user@example.com',
    role: UserRole.USER,
  };

  const mockSessions = [
    {
      id: 'session-1',
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      lastActivity: '2025-11-21T10:30:00.000Z',
      createdAt: '2025-11-21T08:00:00.000Z',
      expiresAt: '2025-11-28T08:00:00.000Z',
    },
    {
      id: 'session-2',
      userId: 'user-123',
      ipAddress: '192.168.1.2',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      lastActivity: '2025-11-21T09:15:00.000Z',
      createdAt: '2025-11-20T14:30:00.000Z',
      expiresAt: '2025-11-27T14:30:00.000Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use('/auth', authRoutes);

    // Global error handler
    app.use(
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err instanceof UnauthorizedError) {
          return res.status(401).json({
            success: false,
            error: {
              message: err.message,
              statusCode: 401,
            },
          });
        }
        if (err instanceof NotFoundError) {
          return res.status(404).json({
            success: false,
            error: {
              message: err.message,
              statusCode: 404,
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

  describe('GET /auth/sessions', () => {
    it('should return all active sessions for authenticated user', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toEqual(mockSessions);
      expect(response.body.data.count).toBe(2);
      expect(SessionService.getUserSessions).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when user has no sessions', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should require authentication', async () => {
      await request(app).get('/auth/sessions').expect(401);
    });

    it('should handle service errors gracefully', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/auth/sessions')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /auth/sessions/:sessionId', () => {
    it('should successfully revoke own session', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);
      (SessionService.deleteSession as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete('/auth/sessions/session-1')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Session revoked successfully');
      expect(SessionService.deleteSession).toHaveBeenCalledWith('session-1');
    });

    it('should clear cookies when revoking current session', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);
      (SessionService.deleteSession as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete('/auth/sessions/session-1')
        .set('Authorization', 'Bearer valid_access_token')
        .set('Cookie', ['sessionId=session-1'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Session revoked successfully');

      // Check that cookies are cleared
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        const cookieStrings = Array.isArray(setCookieHeaders)
          ? setCookieHeaders
          : [setCookieHeaders];
        const clearedCookies = cookieStrings.filter((cookie: string) => cookie.includes('=;'));
        expect(clearedCookies.length).toBeGreaterThan(0);
      }
    });

    it('should not clear cookies when revoking different session', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);
      (SessionService.deleteSession as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete('/auth/sessions/session-2')
        .set('Authorization', 'Bearer valid_access_token')
        .set('Cookie', ['sessionId=session-1'])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(SessionService.deleteSession).toHaveBeenCalledWith('session-2');
    });

    it('should return 404 for non-existent session', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);

      const response = await request(app)
        .delete('/auth/sessions/non-existent-session')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('not found');
      expect(SessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should return 404 when trying to revoke another user session', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      // Return empty sessions for this user
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .delete('/auth/sessions/other-user-session')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('does not belong to you');
      expect(SessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should require authentication', async () => {
      await request(app).delete('/auth/sessions/session-1').expect(401);
    });

    it('should handle deletion errors gracefully', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);
      (SessionService.deleteSession as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/auth/sessions/session-1')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Session Security', () => {
    it('should verify session ownership before deletion', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      // Return only current user's sessions (not other user's sessions)
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);

      // Try to delete a session that doesn't belong to the user
      const response = await request(app)
        .delete('/auth/sessions/other-session')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(404);

      expect(response.body.error.message).toContain('does not belong to you');
      // Deletion should not be called since ownership check failed
      expect(SessionService.deleteSession).not.toHaveBeenCalled();
    });

    it('should not expose session existence through error messages', async () => {
      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockUserAuth);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserAuth.userId,
        email: mockUserAuth.email,
        role: mockUserAuth.role,
        isActive: true,
      });
      (SessionService.getUserSessions as jest.Mock).mockResolvedValue(mockSessions);

      // Try both non-existent and other user's session
      const response1 = await request(app)
        .delete('/auth/sessions/non-existent')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(404);

      const response2 = await request(app)
        .delete('/auth/sessions/other-user-session')
        .set('Authorization', 'Bearer valid_access_token')
        .expect(404);

      // Both should return the same error message to prevent enumeration
      expect(response1.body.error.message).toBe(response2.body.error.message);
    });
  });
});
