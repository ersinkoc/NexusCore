import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalServerError,
} from '../app-error';

describe('AppError Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
      expect(error.details).toBeUndefined();
    });

    it('should create error with custom status code', () => {
      const error = new AppError('Custom error', 418);

      expect(error.statusCode).toBe(418);
      expect(error.message).toBe('Custom error');
    });

    it('should create error with custom code', () => {
      const error = new AppError('Test', 400, 'CUSTOM_CODE');

      expect(error.code).toBe('CUSTOM_CODE');
    });

    it('should create error with isOperational flag', () => {
      const error = new AppError('Test', 500, 'ERROR', false);

      expect(error.isOperational).toBe(false);
    });

    it('should create error with details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new AppError('Test', 400, 'ERROR', true, details);

      expect(error.details).toEqual(details);
    });

    it('should have proper prototype chain', () => {
      const error = new AppError('Test');

      expect(Object.getPrototypeOf(error)).toBe(AppError.prototype);
    });

    it('should capture stack trace', () => {
      const error = new AppError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('Error');
      expect(typeof error.stack).toBe('string');
      expect(error.stack!.length).toBeGreaterThan(0);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with 400 status', () => {
      const error = new ValidationError('Invalid input');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create validation error with details', () => {
      const details = { fields: ['email', 'password'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.details).toEqual(details);
      expect(error.statusCode).toBe(400);
    });

    it('should be operational error', () => {
      const error = new ValidationError('Test');

      expect(error.isOperational).toBe(true);
    });
  });

  describe('UnauthorizedError', () => {
    it('should create unauthorized error with 401 status', () => {
      const error = new UnauthorizedError('Not authenticated');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(UnauthorizedError);
      expect(error.message).toBe('Not authenticated');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should use default message if not provided', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Unauthorized');
    });

    it('should be operational error', () => {
      const error = new UnauthorizedError();

      expect(error.isOperational).toBe(true);
    });
  });

  describe('ForbiddenError', () => {
    it('should create forbidden error with 403 status', () => {
      const error = new ForbiddenError('Access denied');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ForbiddenError);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('should use default message if not provided', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Forbidden');
    });

    it('should be operational error', () => {
      const error = new ForbiddenError();

      expect(error.isOperational).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error with 404 status', () => {
      const error = new NotFoundError('Resource not found');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Resource not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use default message if not provided', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });

    it('should be operational error', () => {
      const error = new NotFoundError();

      expect(error.isOperational).toBe(true);
    });
  });

  describe('ConflictError', () => {
    it('should create conflict error with 409 status', () => {
      const error = new ConflictError('Resource already exists');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(ConflictError);
      expect(error.message).toBe('Resource already exists');
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('CONFLICT');
    });

    it('should use default message if not provided', () => {
      const error = new ConflictError();

      expect(error.message).toBe('Resource conflict');
    });

    it('should be operational error', () => {
      const error = new ConflictError();

      expect(error.isOperational).toBe(true);
    });
  });

  describe('RateLimitError', () => {
    it('should create rate limit error with 429 status', () => {
      const error = new RateLimitError('Too many requests');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(RateLimitError);
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should use default message if not provided', () => {
      const error = new RateLimitError();

      expect(error.message).toBe('Too many requests');
    });

    it('should be operational error', () => {
      const error = new RateLimitError();

      expect(error.isOperational).toBe(true);
    });
  });

  describe('InternalServerError', () => {
    it('should create internal server error with 500 status', () => {
      const error = new InternalServerError('Something went wrong');

      expect(error).toBeInstanceOf(AppError);
      expect(error).toBeInstanceOf(InternalServerError);
      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
    });

    it('should use default message if not provided', () => {
      const error = new InternalServerError();

      expect(error.message).toBe('Internal server error');
    });

    it('should be operational error', () => {
      const error = new InternalServerError();

      expect(error.isOperational).toBe(true);
    });

    it('should allow custom details', () => {
      const details = { reason: 'Database error', code: 'DB_001' };
      const error = new InternalServerError('Server error', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('Error inheritance and instanceof checks', () => {
    it('should work with instanceof Error', () => {
      const errors = [
        new ValidationError('test'),
        new UnauthorizedError('test'),
        new ForbiddenError('test'),
        new NotFoundError('test'),
        new ConflictError('test'),
        new RateLimitError('test'),
        new InternalServerError('test'),
      ];

      errors.forEach((error) => {
        expect(error instanceof Error).toBe(true);
        expect(error instanceof AppError).toBe(true);
      });
    });

    it('should be throwable', () => {
      expect(() => {
        throw new ValidationError('test');
      }).toThrow(ValidationError);

      expect(() => {
        throw new NotFoundError('test');
      }).toThrow(NotFoundError);
    });

    it('should work in try-catch blocks', () => {
      try {
        throw new UnauthorizedError('Not logged in');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error).toBeInstanceOf(AppError);
        expect((error as UnauthorizedError).statusCode).toBe(401);
      }
    });
  });
});
