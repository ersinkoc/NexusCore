import { prisma } from '@nexuscore/db';
import { PaginationInput, UserFilter, UserRole } from '@nexuscore/types';

import { NotFoundError, ValidationError } from '../../core/errors';

/**
 * Users Service
 * Handles user management operations
 */
export class UsersService {
  // Whitelist of allowed sort fields to prevent SQL injection
  private static readonly ALLOWED_SORT_FIELDS = [
    'email',
    'firstName',
    'lastName',
    'role',
    'isActive',
    'createdAt',
    'updatedAt',
  ] as const;

  /**
   * Get all users with pagination
   */
  async getUsers(pagination: PaginationInput, filter?: UserFilter) {
    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Validate sortBy field against whitelist to prevent SQL injection
    if (!UsersService.ALLOWED_SORT_FIELDS.includes(sortBy as any)) {
      throw new ValidationError(
        `Invalid sort field. Allowed fields: ${UsersService.ALLOWED_SORT_FIELDS.join(', ')}`
      );
    }

    // Build where clause - let TypeScript infer the type for Prisma compatibility
    const where: Record<string, unknown> = {};

    if (filter?.role) {
      where.role = filter.role;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.search) {
      where.OR = [
        { email: { contains: filter.search, mode: 'insensitive' } },
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: { firstName?: string; lastName?: string; role?: string }) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Validate role if provided
    if (data.role && !Object.values(UserRole).includes(data.role as UserRole)) {
      throw new ValidationError(
        `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.delete({ where: { id } });

    return { success: true };
  }

  /**
   * Deactivate user
   */
  async deactivateUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return { success: true };
  }
}
