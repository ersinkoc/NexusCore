import { redis } from '../../core/redis';
import { logger } from '../../core/logger';

/**
 * Account Lockout Service
 * Implements account lockout mechanism using Redis to prevent brute-force attacks
 */
export class AccountLockoutService {
  // Configuration
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION_MINUTES = 15;
  private static readonly ATTEMPT_WINDOW_MINUTES = 15;

  // Redis key prefixes
  private static readonly FAILED_ATTEMPTS_PREFIX = 'auth:failed_attempts:';
  private static readonly LOCKOUT_PREFIX = 'auth:lockout:';

  /**
   * Record a failed login attempt
   * Returns true if account should be locked
   */
  static async recordFailedAttempt(email: string): Promise<boolean> {
    const key = this.FAILED_ATTEMPTS_PREFIX + email;
    const lockoutKey = this.LOCKOUT_PREFIX + email;

    try {
      // Check if already locked
      const isLocked = await redis.get(lockoutKey);
      if (isLocked) {
        return true;
      }

      // Increment failed attempts counter
      const attempts = await redis.incr(key);

      // Set expiry on first attempt (15 minute window)
      if (attempts === 1) {
        await redis.expire(key, this.ATTEMPT_WINDOW_MINUTES * 60);
      }

      logger.warn('Failed login attempt recorded', {
        email,
        attempts,
        maxAttempts: this.MAX_FAILED_ATTEMPTS,
      });

      // Lock account if max attempts reached
      if (attempts >= this.MAX_FAILED_ATTEMPTS) {
        await redis.setex(lockoutKey, this.LOCKOUT_DURATION_MINUTES * 60, attempts.toString());

        logger.warn('Account locked due to excessive failed attempts', {
          email,
          attempts,
          lockoutDuration: `${this.LOCKOUT_DURATION_MINUTES} minutes`,
        });

        return true;
      }

      return false;
    } catch (error) {
      // Redis errors shouldn't prevent authentication flow
      logger.error('Failed to record login attempt in Redis', { email, error });
      return false;
    }
  }

  /**
   * Check if an account is currently locked
   */
  static async isAccountLocked(email: string): Promise<{
    locked: boolean;
    remainingTime?: number;
    attempts?: number;
  }> {
    const lockoutKey = this.LOCKOUT_PREFIX + email;

    try {
      const [lockoutValue, ttl] = await Promise.all([redis.get(lockoutKey), redis.ttl(lockoutKey)]);

      if (lockoutValue) {
        const attempts = parseInt(lockoutValue, 10);
        return {
          locked: true,
          remainingTime: ttl > 0 ? ttl : undefined,
          attempts,
        };
      }

      return { locked: false };
    } catch (error) {
      // Redis errors shouldn't prevent authentication flow
      logger.error('Failed to check account lockout status', { email, error });
      return { locked: false };
    }
  }

  /**
   * Get remaining failed attempts before lockout
   */
  static async getRemainingAttempts(email: string): Promise<number> {
    const key = this.FAILED_ATTEMPTS_PREFIX + email;

    try {
      const attempts = await redis.get(key);
      const failedAttempts = attempts ? parseInt(attempts, 10) : 0;
      return Math.max(0, this.MAX_FAILED_ATTEMPTS - failedAttempts);
    } catch (error) {
      logger.error('Failed to get remaining attempts', { email, error });
      return this.MAX_FAILED_ATTEMPTS; // Fail open on Redis errors
    }
  }

  /**
   * Clear failed login attempts (after successful login)
   */
  static async clearFailedAttempts(email: string): Promise<void> {
    const key = this.FAILED_ATTEMPTS_PREFIX + email;

    try {
      await redis.del(key);
      logger.info('Failed login attempts cleared', { email });
    } catch (error) {
      logger.error('Failed to clear login attempts', { email, error });
    }
  }

  /**
   * Manually unlock an account (admin action)
   */
  static async unlockAccount(email: string): Promise<void> {
    const lockoutKey = this.LOCKOUT_PREFIX + email;
    const attemptsKey = this.FAILED_ATTEMPTS_PREFIX + email;

    try {
      await Promise.all([redis.del(lockoutKey), redis.del(attemptsKey)]);

      logger.info('Account manually unlocked', { email });
    } catch (error) {
      logger.error('Failed to unlock account', { email, error });
      throw error;
    }
  }
}
