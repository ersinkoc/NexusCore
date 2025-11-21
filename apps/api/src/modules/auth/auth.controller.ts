import { Request, Response } from 'express';

import { LoginSchema, RegisterSchema, AuthenticatedRequest } from '@nexuscore/types';

import { asyncHandler } from '../../shared/utils';
import { AuthService } from './auth.service';
import { CsrfService } from '../../shared/services';
import { UnauthorizedError } from '../../core/errors';

const authService = new AuthService();

/**
 * Authentication Controller
 * Handles HTTP requests for authentication
 */
export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  register = asyncHandler(async (req: Request, res: Response) => {
    const input = RegisterSchema.parse(req.body);
    const result = await authService.register(input, req);

    // Generate CSRF token for authenticated session
    const csrfToken = CsrfService.generateToken();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set CSRF token as httpOnly cookie
    res.cookie('csrfToken', csrfToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set session ID as httpOnly cookie
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        csrfToken: csrfToken.signature, // Client includes this in X-CSRF-Token header
      },
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input, req);

    // Generate CSRF token for authenticated session
    const csrfToken = CsrfService.generateToken();

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set CSRF token as httpOnly cookie
    res.cookie('csrfToken', csrfToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set session ID as httpOnly cookie
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        csrfToken: csrfToken.signature, // Client includes this in X-CSRF-Token header
      },
    });
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    const sessionId = req.cookies.sessionId;
    const user = (req as AuthenticatedRequest).user;

    if (refreshToken) {
      await authService.logout(refreshToken, sessionId, user?.userId, req);
    }

    // Clear refresh token, CSRF token, and session ID cookies
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    res.clearCookie('sessionId');

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  });

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedError('Refresh token not found');
    }

    const result = await authService.refresh(refreshToken, req);

    // Set new refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        accessToken: result.accessToken,
      },
    });
  });

  /**
   * Get current user
   * GET /api/auth/me
   */
  me = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    res.status(200).json({
      success: true,
      data: { user },
    });
  });

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  logoutAll = asyncHandler(async (req: Request, res: Response) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const result = await authService.logoutAll(user.userId, req);

    // Clear current refresh token, CSRF token, and session ID cookies
    res.clearCookie('refreshToken');
    res.clearCookie('csrfToken');
    res.clearCookie('sessionId');

    res.status(200).json({
      success: true,
      data: {
        message: 'Logged out from all devices successfully',
        devicesLoggedOut: result.devicesLoggedOut,
      },
    });
  });
}
