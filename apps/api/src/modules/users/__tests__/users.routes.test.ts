import 'express-async-errors';
import request from 'supertest';
import express, { Express } from 'express';
import usersRoutes from '../users.routes';
import { UsersService } from '../users.service';
import { UserRole } from '@nexuscore/types';
import { NotFoundError, ForbiddenError } from '../../../core/errors';

// Mock prisma
jest.mock('@nexuscore/db', () => ({
  prisma: {
    user: {},
  },
}));

// Mock UsersService
jest.mock('../users.service');

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock JWTService
jest.mock('../../../shared/services', () => ({
  JWTService: {
    verifyAccessToken: jest.fn(),
  },
  PasswordService: {},
}));

// Mock auth middleware
jest.mock('../../auth/auth.middleware', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    // Mock user for authenticated requests
    _req.user = {
      id: 'auth-user-id',
      email: 'auth@example.com',
      role: UserRole.ADMIN,
    };
    next();
  },
  requireRole: (roles: UserRole[]) => (_req: any, res: any, next: any) => {
    // Check if user has required role
    if (!_req.user || !roles.includes(_req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  },
}));

describe('Users Routes Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use('/users', usersRoutes);

    // Global error handler
    app.use(
      (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        if (err.name === 'ZodError') {
          return res.status(400).json({ error: 'Validation error' });
        }
        if (err instanceof NotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        if (err instanceof ForbiddenError) {
          return res.status(403).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
    );
  });

  describe('GET /users', () => {
    it('should return paginated users', async () => {
      const mockResult = {
        data: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      };

      (UsersService.prototype.getUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/users').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual(mockResult.pagination);
    });

    it('should filter users by role', async () => {
      const mockResult = {
        data: [
          {
            id: 'admin-1',
            email: 'admin@example.com',
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      (UsersService.prototype.getUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/users').query({ role: UserRole.ADMIN }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].role).toBe(UserRole.ADMIN);
    });

    it('should filter users by isActive status', async () => {
      const mockResult = {
        data: [
          {
            id: 'user-1',
            email: 'active@example.com',
            firstName: 'Active',
            lastName: 'User',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      (UsersService.prototype.getUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/users').query({ isActive: 'true' }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data[0].isActive).toBe(true);
    });

    it('should search users by keyword', async () => {
      const mockResult = {
        data: [
          {
            id: 'user-1',
            email: 'john@example.com',
            firstName: 'John',
            lastName: 'Doe',
            role: UserRole.USER,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      (UsersService.prototype.getUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/users').query({ search: 'john' }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
    });

    it('should handle pagination parameters', async () => {
      const mockResult = {
        data: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      };

      (UsersService.prototype.getUsers as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app).get('/users').query({ page: 2, limit: 20 }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(20);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UsersService.prototype.getUserById as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app).get(`/users/${userId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(userId);
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return 404 if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      (UsersService.prototype.getUserById as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );

      const response = await request(app).get(`/users/${userId}`).expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('PATCH /users/:id', () => {
    it('should update user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440002';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: UserRole.USER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UsersService.prototype.updateUser as jest.Mock).mockResolvedValue(mockUser);

      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const response = await request(app).patch(`/users/${userId}`).send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Updated');
      expect(response.body.data.lastName).toBe('Name');
    });

    it('should update user role', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440003';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.MODERATOR,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (UsersService.prototype.updateUser as jest.Mock).mockResolvedValue(mockUser);

      const updateData = {
        role: UserRole.MODERATOR,
      };

      const response = await request(app).patch(`/users/${userId}`).send(updateData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.MODERATOR);
    });

    it('should return 404 if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440004';
      (UsersService.prototype.updateUser as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );

      const updateData = {
        firstName: 'Updated',
      };

      const response = await request(app).patch(`/users/${userId}`).send(updateData).expect(404);

      expect(response.body.error).toContain('User not found');
    });

    it('should return 400 for invalid input', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440005';
      const invalidData = {
        email: 'invalid-email', // Invalid email format
      };

      await request(app).patch(`/users/${userId}`).send(invalidData).expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440006';
      (UsersService.prototype.deleteUser as jest.Mock).mockResolvedValue({
        success: true,
      });

      const response = await request(app).delete(`/users/${userId}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440007';
      (UsersService.prototype.deleteUser as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );

      const response = await request(app).delete(`/users/${userId}`).expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('POST /users/:id/deactivate', () => {
    it('should deactivate user successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440008';
      (UsersService.prototype.deactivateUser as jest.Mock).mockResolvedValue({
        success: true,
      });

      const response = await request(app).post(`/users/${userId}/deactivate`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(true);
    });

    it('should return 404 if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440009';
      (UsersService.prototype.deactivateUser as jest.Mock).mockRejectedValue(
        new NotFoundError('User not found')
      );

      const response = await request(app).post(`/users/${userId}/deactivate`).expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });
});
