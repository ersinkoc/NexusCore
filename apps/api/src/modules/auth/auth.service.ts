import { prisma } from '@nexuscore/db';
import { LoginInput, RegisterInput, JWTPayload, UserRole } from '@nexuscore/types';

import { ConflictError, UnauthorizedError, NotFoundError } from '../../core/errors';
import { PasswordService, JWTService } from '../../shared/services';
import { eventBus } from '../../core/event-bus';
import { logger } from '../../core/logger';

/**
 * Authentication Service
 * Handles user authentication operations
 */
export class AuthService {
  /**
   * Register a new user
   * Uses transaction to ensure user and refresh token are created atomically
   */
  async register(input: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Always hash password to prevent timing attacks (even if user exists)
    // This ensures consistent response time regardless of email existence
    const hashedPassword = await PasswordService.hash(input.password);

    if (existingUser) {
      // Generic error message to prevent email enumeration
      // Attackers cannot determine if email is already registered
      throw new ConflictError('Registration failed. Please check your information and try again.');
    }

    // Use transaction to create user and refresh token atomically
    const result = await prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          role: UserRole.USER as any,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      // Generate JWT tokens
      const jwtPayload: JWTPayload = {
        userId: user.id,
        email: user.email,
        role: user.role as UserRole,
      };

      const accessToken = JWTService.generateAccessToken(jwtPayload);
      const refreshToken = JWTService.generateRefreshToken(jwtPayload);

      // Calculate expiry (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store refresh token in database
      await tx.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });

      return { user, accessToken, refreshToken };
    });

    logger.info('User registered', { userId: result.user.id, email: result.user.email });

    // Emit event for other modules (after successful transaction)
    eventBus.emit('auth.registered', {
      userId: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
    });

    return result;
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Use dummy hash to prevent timing attacks
    // Always perform password verification regardless of user existence
    // This ensures consistent response times for valid/invalid emails
    const dummyHash = '$2b$10$YQvZ8Xw5rJZK5X5Z5X5Z5eN.rR8X5X5X5X5X5X5X5X5X5X5X5X5X5';
    const passwordToVerify = user?.password || dummyHash;
    const isValidPassword = await PasswordService.verify(input.password, passwordToVerify);

    // Check user existence and active status after password verification
    if (!user || !user.isActive || !isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if password needs rehashing
    if (PasswordService.needsRehash(user.password)) {
      const newHash = await PasswordService.hash(input.password);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }

    logger.info('User logged in', { userId: user.id, email: user.email });

    // Emit event
    eventBus.emit('auth.login', {
      userId: user.id,
      email: user.email,
    });

    // Generate tokens (cast Prisma UserRole to shared types UserRole - same values)
    const tokens = await this.generateTokens(user.id, user.email, user.role as UserRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        createdAt: user.createdAt,
      },
      ...tokens,
    };
  }

  /**
   * Logout user
   */
  async logout(refreshToken: string) {
    // Delete refresh token from database
    const deleted = await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });

    if (deleted.count === 0) {
      throw new NotFoundError('Refresh token not found');
    }

    logger.info('User logged out', { refreshToken });

    return { success: true };
  }

  /**
   * Logout from all devices
   * Deletes all refresh tokens for a user
   */
  async logoutAll(userId: string) {
    // Delete all refresh tokens for this user
    const deleted = await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    logger.info('User logged out from all devices', { userId, count: deleted.count });

    return { success: true, devicesLoggedOut: deleted.count };
  }

  /**
   * Refresh access token using refresh token
   * Uses transaction to ensure old token deletion and new token creation are atomic
   */
  async refresh(refreshToken: string) {
    // Check if refresh token exists in database first
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Verify token signature and expiration
    JWTService.verifyRefreshToken(refreshToken);

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Use transaction for token rotation: delete old, create new atomically
    const tokens = await prisma.$transaction(async (tx: any) => {
      // Delete old refresh token (rotation)
      await tx.refreshToken.delete({ where: { id: storedToken.id } });

      // Generate JWT tokens
      const jwtPayload: JWTPayload = {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role as UserRole,
      };

      const accessToken = JWTService.generateAccessToken(jwtPayload);
      const newRefreshToken = JWTService.generateRefreshToken(jwtPayload);

      // Calculate expiry (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Store new refresh token in database
      await tx.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: storedToken.user.id,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
      };
    });

    logger.info('Token refreshed', { userId: storedToken.user.id });

    return tokens;
  }

  /**
   * Generate access and refresh tokens
   * Implements token limit per user and cleanup of expired tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole) {
    const MAX_TOKENS_PER_USER = 5; // Maximum active tokens per user

    // Use transaction for atomic cleanup and token creation
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Delete expired tokens for this user
      await tx.refreshToken.deleteMany({
        where: {
          userId,
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      // 2. Get active tokens count
      const activeTokens = await tx.refreshToken.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });

      // 3. If user has too many tokens, delete oldest ones
      if (activeTokens.length >= MAX_TOKENS_PER_USER) {
        const tokensToDelete = activeTokens.slice(0, activeTokens.length - MAX_TOKENS_PER_USER + 1);
        await tx.refreshToken.deleteMany({
          where: {
            id: {
              in: tokensToDelete.map((t: any) => t.id),
            },
          },
        });
        logger.info('Deleted old refresh tokens', { userId, count: tokensToDelete.length });
      }

      // 4. Generate new tokens
      const jwtPayload: JWTPayload = {
        userId,
        email,
        role,
      };

      const accessToken = JWTService.generateAccessToken(jwtPayload);
      const refreshToken = JWTService.generateRefreshToken(jwtPayload);

      // Calculate expiry (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // 5. Store new refresh token in database
      await tx.refreshToken.create({
        data: {
          token: refreshToken,
          userId,
          expiresAt,
        },
      });

      return {
        accessToken,
        refreshToken,
      };
    });

    return result;
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): JWTPayload {
    return JWTService.verifyAccessToken(token);
  }
}
