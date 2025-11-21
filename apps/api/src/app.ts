import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { errorHandler } from './core/middleware/error.middleware';
import { requestLogger } from './core/middleware/logger.middleware';
import { notFoundHandler } from './core/middleware/not-found.middleware';
import { ModuleLoader } from './core/module-loader';
import { logger } from './core/logger';

export class App {
  private app: Application;
  private moduleLoader: ModuleLoader;

  constructor() {
    this.app = express();
    this.moduleLoader = new ModuleLoader(this.app);
  }

  async initialize(): Promise<void> {
    logger.info('Initializing application...');

    // Security middleware with strict CSP
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline for styled-components support
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        strictTransportSecurity: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
      })
    );
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      })
    );

    // Rate limiting - General API protection
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
      legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    });

    // Stricter rate limiting for authentication endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login/register attempts per windowMs
      message: 'Too many authentication attempts, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: true, // Don't count successful requests
    });

    // Rate limiting for resource-intensive operations (post creation, etc.)
    const creationLimiter = rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 10, // Limit each IP to 10 create operations per hour
      message: 'Too many create requests, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Apply general rate limiter to all API routes
    this.app.use('/api/', apiLimiter);

    // Stricter rate limiting for auth routes (will be applied in auth module)
    this.app.set('authLimiter', authLimiter);

    // Rate limiting for creation endpoints (will be applied in resource modules)
    this.app.set('creationLimiter', creationLimiter);

    // Body parsing - Reduced from 10mb to 1mb for security
    // If specific endpoints need larger limits, apply them individually
    this.app.use(express.json({ limit: '1mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    this.app.use(cookieParser());

    // Request logging
    this.app.use(requestLogger);

    // Health check
    this.app.get('/health', (_req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        },
      });
    });

    // Load modules dynamically (with error tolerance)
    try {
      await this.moduleLoader.loadModules();
    } catch (error) {
      logger.error('Failed to load some modules:', error);
      // Continue with server startup even if some modules fail
    }

    // Error handling (must be last)
    this.app.use(notFoundHandler);
    this.app.use(errorHandler);

    logger.info('Application initialized successfully');
  }

  listen(port: number | string, callback?: () => void) {
    return this.app.listen(port, callback);
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down application...');
    await this.moduleLoader.cleanup();
    logger.info('Application shutdown complete');
  }

  getApp(): Application {
    return this.app;
  }
}
