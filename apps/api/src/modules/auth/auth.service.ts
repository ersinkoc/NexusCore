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
   */
  async register(input: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await PasswordService.hash(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        role: UserRole.USER,
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

    logger.info('User registered', { userId: user.id, email: user.email });

    // Emit event for other modules
    eventBus.emit('auth.registered', {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await PasswordService.verify(input.password, user.password);

    if (!isValidPassword) {
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

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
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
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string) {
    // Verify refresh token
    JWTService.verifyRefreshToken(refreshToken);

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new UnauthorizedError('Refresh token expired');
    }

    // Check if user is still active
    if (!storedToken.user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Delete old refresh token (rotation)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Generate new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.role
    );

    logger.info('Token refreshed', { userId: storedToken.user.id });

    return tokens;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(userId: string, email: string, role: UserRole) {
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

    // Store refresh token in database
    await prisma.refreshToken.create({
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
  }

  /**
   * Validate access token
   */
  validateAccessToken(token: string): JWTPayload {
    return JWTService.verifyAccessToken(token);
  }
}
