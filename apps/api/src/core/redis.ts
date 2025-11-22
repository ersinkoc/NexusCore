import Redis from 'ioredis';

import { logger } from './logger';

/**
 * Shared Redis client for the application
 * Used for caching, session management, and account lockout tracking
 */
class RedisClient {
  private static instance: Redis;

  /**
   * Get or create Redis instance
   */
  static getInstance(): Redis {
    if (!this.instance) {
      this.instance = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 50, 2000);
          logger.warn(`Redis connection failed, retrying in ${delay}ms...`, { attempt: times });
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.instance.on('connect', () => {
        logger.info('Redis connected successfully');
      });

      this.instance.on('error', (error: Error) => {
        logger.error('Redis error:', error);
      });

      this.instance.on('close', () => {
        logger.warn('Redis connection closed');
      });
    }

    return this.instance;
  }

  /**
   * Disconnect Redis instance
   */
  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      logger.info('Redis disconnected');
    }
  }
}

export const redis = RedisClient.getInstance();
export { RedisClient };
