import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { errorHandler } from '../error.middleware';
import { requestLogger } from '../logger.middleware';
import { notFoundHandler } from '../not-found.middleware';
import { AppError, NotFoundError, UnauthorizedError } from '../../errors';
import { logger } from '../../logger';

// Mock logger
jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
      headers: {},
      get: jest.fn((header: string): string | string[] | undefined => {
        if (header === 'user-agent') return 'test-agent';
        if (header === 'set-cookie') return undefined;
        return undefined;
      }) as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      on: jest.fn(),
      statusCode: 200,
    };

    mockNext = jest.fn();

    // Set environment to test
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  describe('errorHandler', () => {
    it('should handle ZodError and return 400', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          path: ['email'],
          message: 'Invalid email',
          expected: 'string',
          received: 'undefined',
        },
        {
          code: 'invalid_type',
          path: ['password'],
          message: 'Required',
          expected: 'string',
          received: 'undefined',
        },
      ]);

      errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: [
            {
              path: 'email',
              message: 'Invalid email',
            },
            {
              path: 'password',
              message: 'Required',
            },
          ],
        },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle AppError (NotFoundError) and return correct status', () => {
      const notFoundError = new NotFoundError('User not found');

      errorHandler(notFoundError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle AppError (UnauthorizedError) and return 401', () => {
      const unauthorizedError = new UnauthorizedError('Invalid credentials');

      errorHandler(unauthorizedError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        },
      });
    });

    it('should handle AppError with details', () => {
      const errorWithDetails = new AppError('Custom error', 400, 'CUSTOM_ERROR', true, {
        field: 'email',
        reason: 'duplicate',
      });

      errorHandler(errorWithDetails, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CUSTOM_ERROR',
          message: 'Custom error',
          details: {
            field: 'email',
            reason: 'duplicate',
          },
        },
      });
    });

    it('should include stack trace in development mode for AppError', () => {
      process.env.NODE_ENV = 'development';

      const error = new NotFoundError('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Test error',
          stack: expect.any(String),
        }),
      });
    });

    it('should handle unknown errors and return 500', () => {
      const unknownError = new Error('Something went wrong');

      errorHandler(unknownError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      });
    });

    it('should hide error message in production for unknown errors', () => {
      process.env.NODE_ENV = 'production';

      const unknownError = new Error('Sensitive internal error');

      errorHandler(unknownError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
      });
    });

    it('should include stack trace in development for unknown errors', () => {
      process.env.NODE_ENV = 'development';

      const unknownError = new Error('Debug error');

      errorHandler(unknownError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Debug error',
          stack: expect.any(String),
        }),
      });
    });
  });

  describe('requestLogger', () => {
    it('should add correlation ID from header if present', () => {
      mockRequest.headers = {
        'x-correlation-id': 'existing-correlation-id',
      };

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-Correlation-ID',
        'existing-correlation-id'
      );
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          correlationId: 'existing-correlation-id',
          method: 'GET',
          path: '/test',
        })
      );
    });

    it('should generate correlation ID if not present', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
      expect(mockNext).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          correlationId: expect.any(String),
          method: 'GET',
          path: '/test',
        })
      );
    });

    it('should log request with user agent and IP', () => {
      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        'Incoming request',
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
        })
      );
    });

    it('should log response on finish event', () => {
      let finishCallback: (() => void) | undefined;

      mockResponse.on = jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockResponse as Response;
      });

      mockResponse.statusCode = 200;

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger finish event
      if (finishCallback) {
        finishCallback();
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          method: 'GET',
          path: '/test',
          statusCode: 200,
          duration: expect.stringContaining('ms'),
        })
      );
    });

    it('should log response with error status code', () => {
      let finishCallback: (() => void) | undefined;

      mockResponse.on = jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        }
        return mockResponse as Response;
      });

      mockResponse.statusCode = 500;

      requestLogger(mockRequest as Request, mockResponse as Response, mockNext);

      // Trigger finish event
      if (finishCallback) {
        finishCallback();
      }

      expect(logger.info).toHaveBeenCalledWith(
        'Request completed',
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('should return 404 with proper error structure', () => {
      notFoundHandler(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      });
    });

    it('should handle different request paths', () => {
      const customRequest = {
        ...mockRequest,
        path: '/nonexistent/path',
      };

      notFoundHandler(customRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      });
    });
  });
});
