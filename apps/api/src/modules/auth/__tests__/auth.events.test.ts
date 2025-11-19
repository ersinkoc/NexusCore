import { onUserRegistered, onUserLogin } from '../auth.events';
import { logger } from '../../../core/logger';

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Auth Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('onUserRegistered', () => {
    it('should log user registration event', async () => {
      const payload = {
        userId: 'user-123',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      await onUserRegistered(payload);

      expect(logger.info).toHaveBeenCalledWith('New user registered', {
        userId: 'user-123',
        email: 'newuser@example.com',
      });
    });

    it('should handle user registration with all fields', async () => {
      const payload = {
        userId: 'user-456',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      await onUserRegistered(payload);

      expect(logger.info).toHaveBeenCalledTimes(1);
      expect(logger.info).toHaveBeenCalledWith(
        'New user registered',
        expect.objectContaining({
          userId: 'user-456',
          email: 'test@example.com',
        })
      );
    });
  });

  describe('onUserLogin', () => {
    it('should log user login event', async () => {
      const payload = {
        userId: 'user-789',
        email: 'user@example.com',
      };

      await onUserLogin(payload);

      expect(logger.info).toHaveBeenCalledWith('User login event', {
        userId: 'user-789',
        email: 'user@example.com',
      });
    });

    it('should log multiple login events', async () => {
      const payload1 = {
        userId: 'user-1',
        email: 'user1@example.com',
      };

      const payload2 = {
        userId: 'user-2',
        email: 'user2@example.com',
      };

      await onUserLogin(payload1);
      await onUserLogin(payload2);

      expect(logger.info).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenNthCalledWith(1, 'User login event', {
        userId: 'user-1',
        email: 'user1@example.com',
      });
      expect(logger.info).toHaveBeenNthCalledWith(2, 'User login event', {
        userId: 'user-2',
        email: 'user2@example.com',
      });
    });
  });
});
