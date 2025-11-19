import { Application, Router } from 'express';
import { ModuleLoader } from '../module-loader';
import { logger } from '../logger';
import * as fs from 'fs';

// Mock dependencies
jest.mock('fs');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../event-bus', () => ({
  eventBus: {
    on: jest.fn(),
    emit: jest.fn(),
    off: jest.fn(),
    once: jest.fn(),
    removeAllListeners: jest.fn(),
  },
}));

describe('ModuleLoader', () => {
  let moduleLoader: ModuleLoader;
  let mockApp: Partial<Application>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApp = {
      use: jest.fn(),
    } as any;

    moduleLoader = new ModuleLoader(mockApp as Application);
  });

  describe('constructor', () => {
    it('should create instance with app', () => {
      expect(moduleLoader).toBeInstanceOf(ModuleLoader);
      expect(moduleLoader.getModules()).toEqual([]);
    });
  });

  describe('loadModules', () => {
    it('should load modules from modules directory', async () => {
      const mockDirents = [
        { name: 'auth', isDirectory: () => true },
        { name: 'users', isDirectory: () => true },
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      // Mock module imports
      jest.doMock(
        '/home/user/NexusCore/apps/api/src/modules/auth/index.ts',
        () => ({
          default: {
            name: 'auth',
            routes: {} as Router,
          },
        }),
        { virtual: true }
      );

      jest.doMock(
        '/home/user/NexusCore/apps/api/src/modules/users/index.ts',
        () => ({
          default: {
            name: 'users',
            routes: {} as Router,
          },
        }),
        { virtual: true }
      );

      await moduleLoader.loadModules();

      expect(logger.info).toHaveBeenCalledWith('🔌 Loading modules...');
      expect(fs.readdirSync).toHaveBeenCalled();
    });

    it('should filter out non-directory entries', async () => {
      const mockDirents = [
        { name: 'auth', isDirectory: () => true },
        { name: 'readme.md', isDirectory: () => false },
        { name: 'users', isDirectory: () => true },
      ];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      await moduleLoader.loadModules();

      expect(logger.info).toHaveBeenCalledWith('🔌 Loading modules...');
    });

    it('should handle ENOENT error when modules directory does not exist', async () => {
      const error: NodeJS.ErrnoException = new Error('ENOENT');
      error.code = 'ENOENT';

      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await moduleLoader.loadModules();

      expect(logger.warn).toHaveBeenCalledWith(
        'No modules directory found, skipping module loading'
      );
    });

    it('should throw error for non-ENOENT errors', async () => {
      const error = new Error('Permission denied');

      (fs.readdirSync as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(moduleLoader.loadModules()).rejects.toThrow('Permission denied');
    });

    it('should log total number of loaded modules', async () => {
      const mockDirents = [{ name: 'auth', isDirectory: () => true }];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      await moduleLoader.loadModules();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
    });
  });

  describe('loadModule behavior', () => {
    it('should attempt to load modules from directory', async () => {
      const mockDirents = [{ name: 'test-module', isDirectory: () => true }];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      await moduleLoader.loadModules();

      // Should log loading start
      expect(logger.info).toHaveBeenCalledWith('🔌 Loading modules...');
    });

    it('should handle empty modules directory', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);

      await moduleLoader.loadModules();

      expect(logger.info).toHaveBeenCalledWith('✅ Loaded 0 module(s)');
    });

    it('should log completion after loading', async () => {
      const mockDirents = [{ name: 'module1', isDirectory: () => true }];

      (fs.readdirSync as jest.Mock).mockReturnValue(mockDirents);

      await moduleLoader.loadModules();

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Loaded'));
    });
  });

  describe('cleanup', () => {
    it('should call cleanup on all modules that have cleanup method', async () => {
      // Manually add modules to test cleanup
      const mockModule1 = {
        name: 'module1',
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      const mockModule2 = {
        name: 'module2',
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      const mockModule3 = {
        name: 'module3',
        // No cleanup method
      };

      // Access private modules array through getModules
      (moduleLoader as any).modules = [mockModule1, mockModule2, mockModule3];

      await moduleLoader.cleanup();

      expect(mockModule1.cleanup).toHaveBeenCalled();
      expect(mockModule2.cleanup).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cleaning up modules...');
      expect(logger.info).toHaveBeenCalledWith('✓ Cleaned up module: module1');
      expect(logger.info).toHaveBeenCalledWith('✓ Cleaned up module: module2');
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockModule = {
        name: 'failing-module',
        cleanup: jest.fn().mockRejectedValue(new Error('Cleanup failed')),
      };

      (moduleLoader as any).modules = [mockModule];

      await moduleLoader.cleanup();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to cleanup module "failing-module":',
        expect.any(Error)
      );
    });

    it('should cleanup multiple modules even if one fails', async () => {
      const mockModule1 = {
        name: 'module1',
        cleanup: jest.fn().mockRejectedValue(new Error('Failed')),
      };

      const mockModule2 = {
        name: 'module2',
        cleanup: jest.fn().mockResolvedValue(undefined),
      };

      (moduleLoader as any).modules = [mockModule1, mockModule2];

      await moduleLoader.cleanup();

      expect(mockModule1.cleanup).toHaveBeenCalled();
      expect(mockModule2.cleanup).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('✓ Cleaned up module: module2');
    });
  });

  describe('getModules', () => {
    it('should return empty array initially', () => {
      expect(moduleLoader.getModules()).toEqual([]);
    });

    it('should return loaded modules', async () => {
      const mockModule = {
        name: 'test-module',
      };

      (moduleLoader as any).modules = [mockModule];

      expect(moduleLoader.getModules()).toEqual([mockModule]);
    });

    it('should return all loaded modules', async () => {
      const mockModules = [{ name: 'module1' }, { name: 'module2' }, { name: 'module3' }];

      (moduleLoader as any).modules = mockModules;

      expect(moduleLoader.getModules()).toEqual(mockModules);
      expect(moduleLoader.getModules()).toHaveLength(3);
    });
  });
});
