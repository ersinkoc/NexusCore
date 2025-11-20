import { Request, Response } from 'express';

import { LoginSchema, RegisterSchema } from '@nexuscore/types';

import { asyncHandler } from '../../shared/utils';
import { AuthService } from './auth.service';

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
    const result = await authService.register(input);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
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
      },
    });
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  login = asyncHandler(async (req: Request, res: Response) => {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
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
      },
    });
  });

  /**
   * Logout user
   * POST /api/auth/logout
   */
  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

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
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Refresh token not found',
        },
      });
      return;
    }

    const result = await authService.refresh(refreshToken);

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
}
