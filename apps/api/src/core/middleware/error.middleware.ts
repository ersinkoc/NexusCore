import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { AppError } from '../errors';
import { logger } from '../logger';
import { sanitizeForLogging } from '../../shared/utils/sanitize-logs';

/**
 * Global error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  // Log error with sanitized details to prevent sensitive data leakage
  const errorLog: any = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  };

  // Sanitize error details if present (may contain user input)
  if ((err as any).details) {
    errorLog.details = sanitizeForLogging((err as any).details);
  }

  logger.error('Error occurred:', errorLog);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
      },
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}
