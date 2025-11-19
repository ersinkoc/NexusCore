import jwt from 'jsonwebtoken';

import { JWTPayload } from '@nexuscore/types';

import { UnauthorizedError } from '../../core/errors';

/**
 * JWT Service
 * Handles JWT token generation and verification
 */
export class JWTService {
  private static readonly ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'access-secret-key';
  private static readonly REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
  private static readonly ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
  private static readonly REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

  /**
   * Generate access token (short-lived)
   */
  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.ACCESS_SECRET, {
      expiresIn: this.ACCESS_EXPIRY,
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  static generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_EXPIRY,
    });
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
   * Decode token without verification (for debugging)
   */
  static decode(token: string): JWTPayload | null {
    return jwt.decode(token) as JWTPayload | null;
  }
}
