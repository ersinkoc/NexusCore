import { AuthService } from '../auth.service';
import { prisma } from '@nexuscore/db';
import { PasswordService, JWTService } from '../../../shared/services';
import { eventBus } from '../../../core/event-bus';
import { logger } from '../../../core/logger';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../../core/errors';
import { UserRole } from '@nexuscore/types';

// Mock dependencies
jest.mock('@nexuscore/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        user: {
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        refreshToken: {
          create: jest.fn(),
          findUnique: jest.fn(),
          delete: jest.fn(),
          deleteMany: jest.fn(),
        },
      })
    ),
  },
}));

jest.mock('../../../shared/services');
jest.mock('../../../core/event-bus');
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;

  // Create tx mocks that mirror the prisma mocks
  const txMocks = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();

    // Reset transaction mocks
    Object.values(txMocks.user).forEach((fn: jest.Mock) => fn.mockReset());
    Object.values(txMocks.refreshToken).forEach((fn: jest.Mock) => fn.mockReset());

    // Configure $transaction to execute callback with txMocks and return its result
    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: typeof txMocks) => Promise<unknown>) => callback(txMocks)
    );
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const input = {
        email: 'newuser@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const hashedPassword = 'hashed_password';
      const mockUser = {
        id: 'user-123',
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.USER,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (PasswordService.hash as jest.Mock).mockResolvedValue(hashedPassword);
      txMocks.user.create.mockResolvedValue(mockUser);
      txMocks.refreshToken.create.mockResolvedValue({});
      (JWTService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (JWTService.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.register(input);

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(txMocks.user.create).toHaveBeenCalledWith({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: UserRole.USER,
        },
        select: expect.any(Object),
      });
      expect(eventBus.emit).toHaveBeenCalledWith('auth.registered', {
        userId: mockUser.id,
        email: mockUser.email,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
      expect(logger.info).toHaveBeenCalledWith('User registered', {
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw ConflictError if user already exists', async () => {
      const input = {
        email: 'existing@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-user',
        email: input.email,
      });

      await expect(authService.register(input)).rejects.toThrow(ConflictError);
      await expect(authService.register(input)).rejects.toThrow(
        'User with this email already exists'
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: input.email,
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (PasswordService.verify as jest.Mock).mockResolvedValue(true);
      (PasswordService.needsRehash as jest.Mock).mockReturnValue(false);
      (JWTService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (JWTService.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await authService.login(input);

      expect(result.user.email).toBe(input.email);
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(eventBus.emit).toHaveBeenCalledWith('auth.login', {
        userId: mockUser.id,
        email: mockUser.email,
      });
      expect(logger.info).toHaveBeenCalledWith('User logged in', {
        userId: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedError if user not found', async () => {
      const input = {
        email: 'nonexistent@example.com',
        password: 'Password123!',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.login(input)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(input)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError if account is deactivated', async () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: input.email,
        password: 'hashed_password',
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      await expect(authService.login(input)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(input)).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedError if password is invalid', async () => {
      const input = {
        email: 'user@example.com',
        password: 'WrongPassword',
      };

      const mockUser = {
        id: 'user-123',
        email: input.email,
        password: 'hashed_password',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (PasswordService.verify as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(input)).rejects.toThrow(UnauthorizedError);
      await expect(authService.login(input)).rejects.toThrow('Invalid credentials');
    });

    it('should rehash password if needed', async () => {
      const input = {
        email: 'user@example.com',
        password: 'Password123!',
      };

      const mockUser = {
        id: 'user-123',
        email: input.email,
        password: 'old_hash',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
      };

      const newHash = 'new_hash';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (PasswordService.verify as jest.Mock).mockResolvedValue(true);
      (PasswordService.needsRehash as jest.Mock).mockReturnValue(true);
      (PasswordService.hash as jest.Mock).mockResolvedValue(newHash);
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: newHash });
      (JWTService.generateAccessToken as jest.Mock).mockReturnValue('access_token');
      (JWTService.generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      await authService.login(input);

      expect(PasswordService.hash).toHaveBeenCalledWith(input.password);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: newHash },
      });
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'valid_refresh_token';

      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await authService.logout(refreshToken);

      expect(result.success).toBe(true);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { token: refreshToken },
      });
      expect(logger.info).toHaveBeenCalledWith('User logged out', { refreshToken });
    });

    it('should throw NotFoundError if refresh token not found', async () => {
      const refreshToken = 'invalid_token';

      (prisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(authService.logout(refreshToken)).rejects.toThrow(NotFoundError);
      await expect(authService.logout(refreshToken)).rejects.toThrow('Refresh token not found');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid_refresh_token';
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const mockStoredToken = {
        id: 'token-id',
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: UserRole.USER,
          isActive: true,
        },
      };

      (JWTService.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);
      txMocks.refreshToken.delete.mockResolvedValue({});
      txMocks.refreshToken.create.mockResolvedValue({});
      (JWTService.generateAccessToken as jest.Mock).mockReturnValue('new_access_token');
      (JWTService.generateRefreshToken as jest.Mock).mockReturnValue('new_refresh_token');

      const result = await authService.refresh(refreshToken);

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(txMocks.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockStoredToken.id },
      });
      expect(logger.info).toHaveBeenCalledWith('Token refreshed', {
        userId: mockStoredToken.user.id,
      });
    });

    it('should throw UnauthorizedError if refresh token not in database', async () => {
      const refreshToken = 'invalid_token';
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      (JWTService.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(authService.refresh(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refresh(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw UnauthorizedError if refresh token is expired', async () => {
      const refreshToken = 'expired_token';
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const mockStoredToken = {
        id: 'token-id',
        token: refreshToken,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: UserRole.USER,
          isActive: true,
        },
      };

      (JWTService.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);
      (prisma.refreshToken.delete as jest.Mock).mockResolvedValue({});

      await expect(authService.refresh(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refresh(refreshToken)).rejects.toThrow('Refresh token expired');
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: mockStoredToken.id },
      });
    });

    it('should throw UnauthorizedError if user account is deactivated', async () => {
      const refreshToken = 'valid_token';
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      const mockStoredToken = {
        id: 'token-id',
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: UserRole.USER,
          isActive: false, // Deactivated
        },
      };

      (JWTService.verifyRefreshToken as jest.Mock).mockReturnValue(mockPayload);
      (prisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(mockStoredToken);

      await expect(authService.refresh(refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(authService.refresh(refreshToken)).rejects.toThrow('Account is deactivated');
    });
  });

  describe('validateAccessToken', () => {
    it('should validate access token successfully', () => {
      const token = 'valid_access_token';
      const mockPayload = {
        userId: 'user-123',
        email: 'user@example.com',
        role: UserRole.USER,
      };

      (JWTService.verifyAccessToken as jest.Mock).mockReturnValue(mockPayload);

      const result = authService.validateAccessToken(token);

      expect(result).toEqual(mockPayload);
      expect(JWTService.verifyAccessToken).toHaveBeenCalledWith(token);
    });
  });
});
