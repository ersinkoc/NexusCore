import { Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, optionalAuth } from '../auth.middleware';
import { JWTService } from '../../../shared/services/jwt.service';
import { UnauthorizedError, ForbiddenError } from '../../../core/errors';
import { AuthenticatedRequest, UserRole } from '@nexuscore/types';

// Mock JWTService
jest.mock('../../../shared/services/jwt.service');

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('requireAuth', () => {
    it('should authenticate valid token and attach user to request', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as UserRole,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalledWith();
      expect(JWTService.verifyAccessToken).toHaveBeenCalledWith('valid-token');
    });

    it('should reject request with missing authorization header', () => {
      mockRequest.headers = {};

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
    });

    it('should reject request with invalid authorization format', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.any(UnauthorizedError)
      );
    });

    it('should reject request with invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (JWTService.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      requireAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalled();
      const error = (nextFunction as jest.Mock).mock.calls[0][0];
      expect(error).toBeDefined();
    });
  });

  describe('requireRole', () => {
    it('should allow access when user has required role', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      };

      const middleware = requireRole([UserRole.ADMIN]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should allow access when user has one of multiple required roles', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.MODERATOR,
      };

      const middleware = requireRole([UserRole.ADMIN, UserRole.MODERATOR]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should deny access when user does not have required role', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const middleware = requireRole([UserRole.ADMIN]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = requireRole([UserRole.ADMIN]);
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
  });

  describe('optionalAuth', () => {
    it('should attach user when valid token provided', () => {
      const mockPayload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER' as UserRole,
      };

      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };

      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toEqual(mockPayload);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should not fail when no token provided', () => {
      mockRequest.headers = {};

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should not fail when invalid token provided', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      (JWTService.verifyAccessToken as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect((mockRequest as AuthenticatedRequest).user).toBeUndefined();
      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});
