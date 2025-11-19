import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await PasswordService.hash(password);
      const hash2 = await PasswordService.hash(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verify', () => {
    it('should verify a correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      const isValid = await PasswordService.verify(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject an incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await PasswordService.hash(password);

      const isValid = await PasswordService.verify(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      const isValid = await PasswordService.verify('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('needsRehash', () => {
    it('should detect if hash needs rehashing', async () => {
      const password = 'TestPassword123!';
      const hash = await PasswordService.hash(password);

      const needsRehash = PasswordService.needsRehash(hash);

      // Should not need rehash with same rounds
      expect(needsRehash).toBe(false);
    });
  });
});
