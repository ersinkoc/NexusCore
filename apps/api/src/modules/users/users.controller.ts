import { Request, Response } from 'express';

import { PaginationSchema, IdParamSchema, UpdateUserSchema } from '@nexuscore/types';

import { asyncHandler } from '../../shared/utils';
import { UsersService } from './users.service';

const usersService = new UsersService();

/**
 * Users Controller
 * Handles HTTP requests for user management
 */
export class UsersController {
  /**
   * Get all users
   * GET /api/users
   */
  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const pagination = PaginationSchema.parse(req.query);
    const filter = {
      role: req.query.role as string | undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      search: req.query.search as string | undefined,
    };

    const result = await usersService.getUsers(pagination, filter);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const user = await usersService.getUserById(id);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  /**
   * Update user
   * PATCH /api/users/:id
   */
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const data = UpdateUserSchema.parse(req.body);

    const user = await usersService.updateUser(id, data);

    res.status(200).json({
      success: true,
      data: user,
    });
  });

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const result = await usersService.deleteUser(id);

    res.status(200).json({
      success: true,
      data: result,
    });
  });

  /**
   * Deactivate user
   * POST /api/users/:id/deactivate
   */
  deactivateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = IdParamSchema.parse(req.params);
    const result = await usersService.deactivateUser(id);

    res.status(200).json({
      success: true,
      data: result,
    });
  });
}
