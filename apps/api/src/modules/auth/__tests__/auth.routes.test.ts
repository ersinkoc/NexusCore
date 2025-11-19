import request from 'supertest';
import express, { Express } from 'express';
import { authRoutes } from '../auth.routes';
import { AuthService } from '../auth.service';
import { ValidationError, UnauthorizedError } from '../../../core/errors';

// Mock AuthService
jest.mock('../auth.service');

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Routes Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create Express app with middleware
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);

    // Global error handler
    app.use(
      (
        err: any,
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
      ) => {
        if (err instanceof ValidationError) {
          return res.status(400).json({ error: err.message });
        }
        if (err instanceof UnauthorizedError) {
          return res.status(401).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
      }
    );
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (AuthService.register as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toEqual({
        user: mockResponse.user,
        accessToken: mockResponse.accessToken,
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(AuthService.register).toHaveBeenCalledWith(registerData);
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
      };

      (AuthService.register as jest.Mock).mockRejectedValue(
        new ValidationError('Invalid email format')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toContain('Invalid email');
    });

    it('should return 400 for weak password', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      };

      (AuthService.register as jest.Mock).mockRejectedValue(
        new ValidationError('Password too weak')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(weakPasswordData)
        .expect(400);

      expect(response.body.error).toContain('weak');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com',
        // missing password, firstName, lastName
      };

      (AuthService.register as jest.Mock).mockRejectedValue(
        new ValidationError('Missing required fields')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const mockResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (AuthService.login as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toEqual({
        user: mockResponse.user,
        accessToken: mockResponse.accessToken,
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(AuthService.login).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      (AuthService.login as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid credentials')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return 400 for missing email', async () => {
      const loginData = {
        password: 'SecurePass123!',
      };

      (AuthService.login as jest.Mock).mockRejectedValue(
        new ValidationError('Email is required')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 for missing password', async () => {
      const loginData = {
        email: 'test@example.com',
      };

      (AuthService.login as jest.Mock).mockRejectedValue(
        new ValidationError('Password is required')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      (AuthService.refreshTokens as jest.Mock).mockResolvedValue(mockResponse);

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=old-refresh-token'])
        .expect(200);

      expect(response.body).toEqual({
        accessToken: mockResponse.accessToken,
      });

      expect(response.headers['set-cookie']).toBeDefined();
      expect(AuthService.refreshTokens).toHaveBeenCalledWith(
        'old-refresh-token'
      );
    });

    it('should return 401 for missing refresh token', async () => {
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Refresh token required')
      );

      const response = await request(app).post('/auth/refresh').expect(401);

      expect(response.body.error).toContain('required');
    });

    it('should return 401 for invalid refresh token', async () => {
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=invalid-token'])
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should return 401 for expired refresh token', async () => {
      (AuthService.refreshTokens as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Refresh token expired')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refreshToken=expired-token'])
        .expect(401);

      expect(response.body.error).toContain('expired');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/auth/logout').expect(200);

      expect(response.body).toEqual({ message: 'Logged out successfully' });
      expect(response.headers['set-cookie']).toBeDefined();
      // Cookie should be cleared
      const cookieHeader = response.headers['set-cookie'];
      expect(cookieHeader.some((c: string) => c.includes('Max-Age=0'))).toBe(
        true
      );
    });

    it('should logout even without refresh token', async () => {
      const response = await request(app).post('/auth/logout').expect(200);

      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /auth/verify', () => {
    it('should verify valid token successfully', async () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      (AuthService.verifyToken as jest.Mock).mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/auth/verify')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({ user: mockUser });
      expect(AuthService.verifyToken).toHaveBeenCalledWith('valid-token');
    });

    it('should return 401 for missing authorization header', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(
        new UnauthorizedError('No token provided')
      );

      const response = await request(app).post('/auth/verify').expect(401);

      expect(response.body.error).toContain('token');
    });

    it('should return 401 for invalid token format', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Invalid token format')
      );

      const response = await request(app)
        .post('/auth/verify')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.error).toContain('Invalid');
    });

    it('should return 401 for expired token', async () => {
      (AuthService.verifyToken as jest.Mock).mockRejectedValue(
        new UnauthorizedError('Token expired')
      );

      const response = await request(app)
        .post('/auth/verify')
        .set('Authorization', 'Bearer expired-token')
        .expect(401);

      expect(response.body.error).toContain('expired');
    });
  });
});
