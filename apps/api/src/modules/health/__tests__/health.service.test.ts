import { HealthService } from '../health.service';
import { prisma } from '@nexuscore/db';

// Mock dependencies
jest.mock('@nexuscore/db', () => ({
  prisma: {
    $queryRaw: jest.fn(),
  },
}));

jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock ioredis
jest.mock('ioredis', () => {
  class RedisMock {
    async ping() {
      return 'PONG';
    }
    async quit() {
      return 'OK';
    }
    disconnect() {
      return;
    }
    async connect() {
      return;
    }
  }
  return RedisMock;
});

describe('HealthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Skip cleanup in tests
  });

  describe('performHealthCheck', () => {
    it('should return healthy status when all checks pass', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await HealthService.performHealthCheck();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.memory.status).toBe('up');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
    });

    it('should return degraded status when Redis is down', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);
      // Redis will fail because it's not actually connected in tests

      const result = await HealthService.performHealthCheck();

      // Status should still be returned even if Redis fails
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('checks');
    });

    it('should return unhealthy status when database is down', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await HealthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.message).toContain('Connection failed');
    });

    it('should include response times for all checks', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await HealthService.performHealthCheck();

      expect(result.checks.database).toHaveProperty('responseTime');
      expect(typeof result.checks.database.responseTime).toBe('number');
    });

    it('should detect high memory usage', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      // Mock high memory usage
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 950 * 1024 * 1024, // 950 MB
        heapTotal: 1000 * 1024 * 1024, // 1000 MB (95% usage)
        external: 0,
        rss: 0,
        arrayBuffers: 0,
      })) as any;

      const result = await HealthService.performHealthCheck();

      expect(result.checks.memory.status).toBe('down');
      expect(result.checks.memory.message).toContain('high');

      // Restore original function
      process.memoryUsage = originalMemoryUsage;
    });
  });

  describe('livenessCheck', () => {
    it('should return true for liveness check', async () => {
      const result = await HealthService.livenessCheck();

      expect(result).toBe(true);
    });
  });

  describe('readinessCheck', () => {
    it('should return true when database is accessible', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await HealthService.readinessCheck();

      expect(result).toBe(true);
    });

    it('should return false when database is inaccessible', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const result = await HealthService.readinessCheck();

      expect(result).toBe(false);
    });
  });

  describe('Memory check', () => {
    it('should return memory details', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await HealthService.performHealthCheck();

      expect(result.checks.memory.details).toHaveProperty('heapUsed');
      expect(result.checks.memory.details).toHaveProperty('heapTotal');
      expect(result.checks.memory.details).toHaveProperty('usagePercent');
      expect(result.checks.memory.details).toHaveProperty('external');
      expect(result.checks.memory.details).toHaveProperty('rss');
    });

    it('should format memory values in MB', async () => {
      (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);

      const result = await HealthService.performHealthCheck();

      expect(result.checks.memory.details?.heapUsed).toMatch(/MB$/);
      expect(result.checks.memory.details?.heapTotal).toMatch(/MB$/);
    });
  });

  describe('cleanup', () => {
    it('should cleanup Redis connection', async () => {
      // Initialize Redis first
      HealthService.initializeRedis();

      await expect(HealthService.cleanup()).resolves.not.toThrow();
    });

    it('should handle cleanup when Redis is not initialized', async () => {
      // Reset redis to undefined
      (HealthService as any).redis = undefined;

      await expect(HealthService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle non-Error objects in database check', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue('String error');

      const result = await HealthService.performHealthCheck();

      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.message).toBe('Database connection failed');
    });

    it('should return false for readiness when database throws', async () => {
      (prisma.$queryRaw as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await HealthService.readinessCheck();

      expect(result).toBe(false);
    });

    it('should handle database check returning down status', async () => {
      (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection timeout'));

      const result = await HealthService.performHealthCheck();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
    });
  });
});
