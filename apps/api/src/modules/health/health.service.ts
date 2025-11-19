import { prisma } from '@nexuscore/db';
import Redis from 'ioredis';
import { logger } from '../../core/logger';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

export class HealthService {
  private static redis: Redis;

  /**
   * Initialize Redis connection for health checks
   */
  static initializeRedis(): void {
    try {
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: () => null, // Don't retry for health checks
        lazyConnect: true,
      });
    } catch (error) {
      logger.error('Failed to initialize Redis for health checks', { error });
    }
  }

  /**
   * Check database health
   */
  private static async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      await prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        message: 'Database connection successful',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Database health check failed', { error });

      return {
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check Redis health
   */
  private static async checkRedis(): Promise<HealthCheck> {
    const startTime = Date.now();

    try {
      if (!this.redis) {
        this.initializeRedis();
      }

      await this.redis.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
        message: 'Redis connection successful',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      logger.error('Redis health check failed', { error });

      return {
        status: 'down',
        responseTime,
        message: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  /**
   * Check memory usage
   */
  private static checkMemory(): HealthCheck {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    // Consider unhealthy if using more than 90% of heap
    const isHealthy = memoryUsagePercent < 90;

    return {
      status: isHealthy ? 'up' : 'down',
      message: isHealthy ? 'Memory usage normal' : 'Memory usage high',
      details: {
        heapUsed: `${(usedMemory / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(totalMemory / 1024 / 1024).toFixed(2)} MB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
      },
    };
  }

  /**
   * Perform comprehensive health check
   */
  static async performHealthCheck(): Promise<HealthCheckResult> {
    const [databaseCheck, redisCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const memoryCheck = this.checkMemory();

    const checks = {
      database: databaseCheck,
      redis: redisCheck,
      memory: memoryCheck,
    };

    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => check.status === 'up');
    const anyDown = Object.values(checks).some((check) => check.status === 'down');

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (allHealthy) {
      status = 'healthy';
    } else if (anyDown && databaseCheck.status === 'down') {
      // Database down is critical
      status = 'unhealthy';
    } else {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  /**
   * Quick liveness check (for Kubernetes, Docker, etc.)
   */
  static async livenessCheck(): Promise<boolean> {
    try {
      // Just check if the process is running
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Readiness check (for load balancers)
   */
  static async readinessCheck(): Promise<boolean> {
    try {
      // Check if database is reachable
      const dbCheck = await this.checkDatabase();
      return dbCheck.status === 'up';
    } catch {
      return false;
    }
  }

  /**
   * Cleanup resources
   */
  static async cleanup(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
