import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';

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

    // Security middleware
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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

    // Load modules dynamically
    await this.moduleLoader.loadModules();

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
