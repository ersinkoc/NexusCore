import { randomBytes, createHmac } from 'crypto';

/**
 * CSRF Service
 * Implements Synchronizer Token Pattern with HMAC-based token verification
 *
 * Security approach: Double Submit Cookie Pattern with HMAC
 * - Token is stored in httpOnly cookie
 * - Token signature is sent in response body for client to include in headers
 * - Server verifies HMAC signature to prevent token forgery
 */
export class CsrfService {
  private static readonly SECRET = (() => {
    const secret = process.env.CSRF_SECRET;
    if (!secret) {
      throw new Error(
        'CSRF_SECRET environment variable is required. ' +
          'Please set it in your .env file for security.'
      );
    }
    return secret;
  })();

  /**
   * Generate a new CSRF token
   * Returns both the token and its HMAC signature
   */
  static generateToken(): { token: string; signature: string } {
    // Generate cryptographically secure random token
    const token = randomBytes(32).toString('hex');

    // Create HMAC signature of the token
    const signature = this.createSignature(token);

    return { token, signature };
  }

  /**
   * Create HMAC signature for a token
   */
  private static createSignature(token: string): string {
    return createHmac('sha256', this.SECRET)
      .update(token)
      .digest('hex');
  }

  /**
   * Verify CSRF token
   * Validates that the provided token and signature match
   *
   * @param token - Token from cookie
   * @param signature - Signature from request header
   * @returns true if valid, false otherwise
   */
  static verifyToken(token: string, signature: string): boolean {
    if (!token || !signature) {
      return false;
    }

    // Generate expected signature from token
    const expectedSignature = this.createSignature(token);

    // Use timing-safe comparison to prevent timing attacks
    try {
      return this.timingSafeEqual(expectedSignature, signature);
    } catch {
      return false;
    }
  }

  /**
   * Timing-safe string comparison
   * Prevents timing attacks by ensuring comparison takes constant time
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}
