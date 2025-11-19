import request from 'supertest';
import express, { Express } from 'express';
import healthRoutes from '../health.routes';
import { HealthService } from '../health.service';

// Mock HealthService
jest.mock('../health.service');

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Health Routes Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/health', healthRoutes);
  });

  describe('GET /health', () => {
    it('should return healthy status when all checks pass', async () => {
      const mockHealthCheck = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 100,
        version: '1.0.0',
        checks: {
          database: {
            status: 'up' as const,
            responseTime: 10,
          },
          redis: {
            status: 'up' as const,
            responseTime: 5,
          },
          memory: {
            status: 'up' as const,
            details: {
              heapUsed: '50 MB',
              heapTotal: '100 MB',
              usagePercent: 50,
              external: '10 MB',
              rss: '120 MB',
            },
          },
        },
      };

      (HealthService.performHealthCheck as jest.Mock).mockResolvedValue(
        mockHealthCheck
      );

      const response = await request(app).get('/health').expect(200);

      expect(response.body).toEqual(mockHealthCheck);
      expect(response.body.status).toBe('healthy');
      expect(HealthService.performHealthCheck).toHaveBeenCalled();
    });

    it('should return degraded status when Redis is down', async () => {
      const mockHealthCheck = {
        status: 'degraded' as const,
        timestamp: new Date().toISOString(),
        uptime: 100,
        version: '1.0.0',
        checks: {
          database: {
            status: 'up' as const,
            responseTime: 10,
          },
          redis: {
            status: 'down' as const,
            message: 'Connection refused',
            responseTime: 0,
          },
          memory: {
            status: 'up' as const,
            details: {
              heapUsed: '50 MB',
              heapTotal: '100 MB',
              usagePercent: 50,
              external: '10 MB',
              rss: '120 MB',
            },
          },
        },
      };

      (HealthService.performHealthCheck as jest.Mock).mockResolvedValue(
        mockHealthCheck
      );

      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('degraded');
      expect(response.body.checks.redis.status).toBe('down');
    });

    it('should return unhealthy status when database is down', async () => {
      const mockHealthCheck = {
        status: 'unhealthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 100,
        version: '1.0.0',
        checks: {
          database: {
            status: 'down' as const,
            message: 'Connection failed',
            responseTime: 0,
          },
          redis: {
            status: 'up' as const,
            responseTime: 5,
          },
          memory: {
            status: 'up' as const,
            details: {
              heapUsed: '50 MB',
              heapTotal: '100 MB',
              usagePercent: 50,
              external: '10 MB',
              rss: '120 MB',
            },
          },
        },
      };

      (HealthService.performHealthCheck as jest.Mock).mockResolvedValue(
        mockHealthCheck
      );

      const response = await request(app).get('/health').expect(200);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.checks.database.status).toBe('down');
    });

    it('should include all required fields in response', async () => {
      const mockHealthCheck = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        uptime: 100,
        version: '1.0.0',
        checks: {
          database: { status: 'up' as const, responseTime: 10 },
          redis: { status: 'up' as const, responseTime: 5 },
          memory: {
            status: 'up' as const,
            details: {
              heapUsed: '50 MB',
              heapTotal: '100 MB',
              usagePercent: 50,
              external: '10 MB',
              rss: '120 MB',
            },
          },
        },
      };

      (HealthService.performHealthCheck as jest.Mock).mockResolvedValue(
        mockHealthCheck
      );

      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('checks');
      expect(response.body.checks).toHaveProperty('database');
      expect(response.body.checks).toHaveProperty('redis');
      expect(response.body.checks).toHaveProperty('memory');
    });

    it('should handle high memory usage warning', async () => {
      const mockHealthCheck = {
        status: 'degraded' as const,
        timestamp: new Date().toISOString(),
        uptime: 100,
        version: '1.0.0',
        checks: {
          database: { status: 'up' as const, responseTime: 10 },
          redis: { status: 'up' as const, responseTime: 5 },
          memory: {
            status: 'down' as const,
            message: 'Memory usage is high',
            details: {
              heapUsed: '950 MB',
              heapTotal: '1000 MB',
              usagePercent: 95,
              external: '10 MB',
              rss: '1200 MB',
            },
          },
        },
      };

      (HealthService.performHealthCheck as jest.Mock).mockResolvedValue(
        mockHealthCheck
      );

      const response = await request(app).get('/health').expect(200);

      expect(response.body.checks.memory.status).toBe('down');
      expect(response.body.checks.memory.message).toContain('high');
      expect(response.body.checks.memory.details.usagePercent).toBeGreaterThan(
        90
      );
    });
  });

  describe('GET /health/liveness', () => {
    it('should return OK for liveness probe', async () => {
      (HealthService.livenessCheck as jest.Mock).mockResolvedValue(true);

      const response = await request(app).get('/health/liveness').expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(HealthService.livenessCheck).toHaveBeenCalled();
    });

    it('should always return 200 even if service has issues', async () => {
      // Liveness check should always pass unless the app is completely dead
      (HealthService.livenessCheck as jest.Mock).mockResolvedValue(true);

      const response = await request(app).get('/health/liveness').expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /health/readiness', () => {
    it('should return OK when service is ready', async () => {
      (HealthService.readinessCheck as jest.Mock).mockResolvedValue(true);

      const response = await request(app).get('/health/readiness').expect(200);

      expect(response.body).toEqual({ status: 'ready' });
      expect(HealthService.readinessCheck).toHaveBeenCalled();
    });

    it('should return 503 when service is not ready', async () => {
      (HealthService.readinessCheck as jest.Mock).mockResolvedValue(false);

      const response = await request(app).get('/health/readiness').expect(503);

      expect(response.body).toEqual({ status: 'not ready' });
    });

    it('should return not ready when database is unavailable', async () => {
      (HealthService.readinessCheck as jest.Mock).mockResolvedValue(false);

      const response = await request(app).get('/health/readiness').expect(503);

      expect(response.body.status).toBe('not ready');
    });
  });
});
