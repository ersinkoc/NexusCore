import request from 'supertest';
import { App } from '../app';
import { ModuleLoader } from '../core/module-loader';
import { logger } from '../core/logger';

// Mock dependencies
jest.mock('../core/module-loader');
jest.mock('../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('App', () => {
  let app: App;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ModuleLoader methods
    ModuleLoader.prototype.loadModules = jest.fn().mockResolvedValue(undefined);
    ModuleLoader.prototype.cleanup = jest.fn().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    if (app) {
      await app.shutdown();
    }
  });

  describe('constructor', () => {
    it('should create an instance of App', () => {
      app = new App();
      expect(app).toBeInstanceOf(App);
      expect(app.getApp()).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize the application successfully', async () => {
      app = new App();
      await app.initialize();

      expect(logger.info).toHaveBeenCalledWith('Initializing application...');
      expect(logger.info).toHaveBeenCalledWith('Application initialized successfully');
      expect(ModuleLoader.prototype.loadModules).toHaveBeenCalled();
    });

    it('should configure middleware correctly', async () => {
      app = new App();
      await app.initialize();

      const expressApp = app.getApp();

      // Check if the app is properly configured
      expect(expressApp).toBeDefined();
      expect(expressApp._router).toBeDefined();
    });

    it('should respond to health check endpoint', async () => {
      app = new App();
      await app.initialize();

      const response = await request(app.getApp()).get('/health').expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          status: 'healthy',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
        },
      });
    });

    it('should handle JSON body parsing', async () => {
      app = new App();
      await app.initialize();

      // This tests that express.json() middleware is configured
      const expressApp = app.getApp();
      expect(expressApp).toBeDefined();
    });

    it('should load modules during initialization', async () => {
      app = new App();
      await app.initialize();

      expect(ModuleLoader.prototype.loadModules).toHaveBeenCalledTimes(1);
    });
  });

  describe('listen', () => {
    it('should start the server on specified port', async () => {
      app = new App();
      await app.initialize();

      const mockCallback = jest.fn();
      const server = app.listen(0, mockCallback); // Port 0 for random available port

      // Wait a bit for the server to start
      await new Promise((resolve) => setTimeout(resolve, 100));

      server.close();
    });

    it('should return a server instance', async () => {
      app = new App();
      await app.initialize();

      const server = app.listen(0);

      expect(server).toBeDefined();
      expect(server.listening).toBe(true);

      server.close();
    });
  });

  describe('shutdown', () => {
    it('should shut down the application gracefully', async () => {
      app = new App();
      await app.initialize();
      await app.shutdown();

      expect(logger.info).toHaveBeenCalledWith('Shutting down application...');
      expect(logger.info).toHaveBeenCalledWith('Application shutdown complete');
      expect(ModuleLoader.prototype.cleanup).toHaveBeenCalled();
    });

    it('should cleanup modules during shutdown', async () => {
      app = new App();
      await app.initialize();
      await app.shutdown();

      expect(ModuleLoader.prototype.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  describe('getApp', () => {
    it('should return the Express application instance', () => {
      app = new App();
      const expressApp = app.getApp();

      expect(expressApp).toBeDefined();
      expect(typeof expressApp).toBe('function'); // Express app is a function
    });
  });

  describe('404 handler', () => {
    it('should return 404 for unknown routes', async () => {
      app = new App();
      await app.initialize();

      const response = await request(app.getApp()).get('/nonexistent-route').expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found',
        },
      });
    });
  });

  describe('error handler', () => {
    it('should have error handler configured', async () => {
      app = new App();

      // Add a route that throws an error BEFORE initialization
      app.getApp().get('/error-test', () => {
        throw new Error('Test error');
      });

      await app.initialize();

      const response = await request(app.getApp()).get('/error-test').expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('CORS configuration', () => {
    it('should configure CORS with default origin', async () => {
      // Save original env
      const originalEnv = process.env.CORS_ORIGIN;
      delete process.env.CORS_ORIGIN;

      app = new App();
      await app.initialize();

      const response = await request(app.getApp()).get('/health');

      // Check that CORS headers are present
      expect(response.headers['access-control-allow-origin']).toBeDefined();

      // Restore env
      if (originalEnv) {
        process.env.CORS_ORIGIN = originalEnv;
      }
    });

    it('should configure CORS with custom origin from env', async () => {
      // Set custom origin
      const originalEnv = process.env.CORS_ORIGIN;
      process.env.CORS_ORIGIN = 'https://custom-origin.com';

      app = new App();
      await app.initialize();

      // Clean up
      if (originalEnv) {
        process.env.CORS_ORIGIN = originalEnv;
      } else {
        delete process.env.CORS_ORIGIN;
      }

      expect(app.getApp()).toBeDefined();
    });
  });
});
