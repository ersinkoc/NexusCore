import { Router, Request, Response } from 'express';
import { HealthService } from './health.service';
import { logger } from '../../core/logger';

const router: Router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Comprehensive health check
 *     description: Returns detailed health information about all services including database, Redis, and memory
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy or degraded but operational
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const healthCheck = await HealthService.performHealthCheck();

    // Set appropriate HTTP status based on health
    let statusCode = 200;
    if (healthCheck.status === 'degraded') {
      statusCode = 200; // Still operational but with issues
    } else if (healthCheck.status === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

/**
 * @swagger
 * /health/live:
 *   get:
 *     summary: Liveness probe
 *     description: Kubernetes liveness probe - checks if the application process is running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not responding
 */
router.get('/live', async (_req: Request, res: Response) => {
  try {
    const isAlive = await HealthService.livenessCheck();

    if (isAlive) {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'dead',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Liveness check failed', { error });
    res.status(503).json({
      status: 'dead',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness probe
 *     description: Kubernetes readiness probe - checks if the application is ready to accept traffic (database connected)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is ready to accept traffic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Application is not ready
 */
router.get('/ready', async (_req: Request, res: Response) => {
  try {
    const isReady = await HealthService.readinessCheck();

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
