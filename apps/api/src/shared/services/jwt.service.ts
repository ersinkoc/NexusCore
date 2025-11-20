import jwt from 'jsonwebtoken';

import { JWTPayload } from '@nexuscore/types';

import { UnauthorizedError } from '../../core/errors';

/**
 * JWT Service
 * Handles JWT token generation and verification
 */
export class JWTService {
  private static readonly ACCESS_SECRET = (() => {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_ACCESS_SECRET environment variable is required. ' +
          'Please set it in your .env file for security.'
      );
    }
    return secret;
  })();

  private static readonly REFRESH_SECRET = (() => {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET environment variable is required. ' +
          'Please set it in your .env file for security.'
      );
    }
    return secret;
  })();

  private static readonly ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private static readonly REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRY,
    } as jwt.SignOptions);
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRY,
    } as jwt.SignOptions);
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.ACCESS_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError('Refresh token expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging ONLY)
   *
   * ⚠️ **SECURITY WARNING**: This method does NOT verify the token signature!
   *
   * This method should NEVER be used for authentication or authorization decisions.
   * It simply decodes the JWT payload without validating its authenticity.
   * An attacker can forge tokens that this method will happily decode.
   *
   * **Valid use cases:**
   * - Debugging during development
   * - Inspecting token structure in logs
   * - Reading public claims from already-verified tokens
   *
   * **ALWAYS use verifyAccessToken() or verifyRefreshToken() for auth!**
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid format
   * @deprecated Consider removing this method or using verify methods instead
   */
  static decode(token: string): JWTPayload | null {
    return jwt.decode(token) as JWTPayload | null;
  }
}
