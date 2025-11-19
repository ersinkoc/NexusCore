import bcrypt from 'bcrypt';

/**
 * Password Service
 * Handles password hashing and verification
 */
export class PasswordService {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash a plain text password
   */
  static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Verify a password against a hash
   */
  static async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if a hash needs to be rehashed (e.g., if salt rounds changed)
   */
  static needsRehash(hash: string): boolean {
    const rounds = bcrypt.getRounds(hash);
    return rounds !== this.SALT_ROUNDS;
  }
}
