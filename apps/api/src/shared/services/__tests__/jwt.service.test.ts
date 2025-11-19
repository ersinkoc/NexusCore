import { JWTService } from '../jwt.service';
import { UserRole } from '@nexuscore/types';
import * as jwt from 'jsonwebtoken';

describe('JWTService', () => {
  const mockPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = JWTService.generateAccessToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include payload data in token', () => {
      const token = JWTService.generateAccessToken(mockPayload);
      const decoded = JWTService.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
      expect(decoded?.role).toBe(mockPayload.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(mockPayload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = JWTService.generateAccessToken(mockPayload);
      const verified = JWTService.verifyAccessToken(token);

      expect(verified).toBeDefined();
      expect(verified.userId).toBe(mockPayload.userId);
      expect(verified.email).toBe(mockPayload.email);
      expect(verified.role).toBe(mockPayload.role);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        JWTService.verifyAccessToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw error for empty token', () => {
      expect(() => {
        JWTService.verifyAccessToken('');
      }).toThrow();
    });

    it('should throw "Access token expired" for expired token', () => {
      // Create expired token by signing with -1s expiry
      const expiredToken = jwt.sign(
        mockPayload,
        process.env.JWT_ACCESS_SECRET || 'access-secret-key',
        {
          expiresIn: '-1s',
        }
      );

      expect(() => {
        JWTService.verifyAccessToken(expiredToken);
      }).toThrow('Access token expired');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = JWTService.generateRefreshToken(mockPayload);
      const verified = JWTService.verifyRefreshToken(token);

      expect(verified).toBeDefined();
      expect(verified.userId).toBe(mockPayload.userId);
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        JWTService.verifyRefreshToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw "Refresh token expired" for expired token', () => {
      const expiredToken = jwt.sign(
        mockPayload,
        process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
        {
          expiresIn: '-1s',
        }
      );

      expect(() => {
        JWTService.verifyRefreshToken(expiredToken);
      }).toThrow('Refresh token expired');
    });
  });

  describe('decode', () => {
    it('should decode token without verification', () => {
      const token = JWTService.generateAccessToken(mockPayload);
      const decoded = JWTService.decode(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockPayload.userId);
      expect(decoded?.email).toBe(mockPayload.email);
    });

    it('should return null for invalid token', () => {
      const decoded = JWTService.decode('invalid.token');

      expect(decoded).toBeNull();
    });
  });
});
