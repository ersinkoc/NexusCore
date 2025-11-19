// Mock HealthService before importing
jest.mock('../health.service', () => ({
  HealthService: {
    initializeRedis: jest.fn(),
    cleanup: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock logger
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { HealthModule as healthModule } from '../index';
import { HealthService } from '../health.service';

describe('Health Module Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export module definition', () => {
    expect(healthModule).toBeDefined();
    expect(healthModule.name).toBe('health');
  });

  it('should have routes', () => {
    expect(healthModule.routes).toBeDefined();
  });

  it('should have init function', () => {
    expect(healthModule.init).toBeDefined();
    expect(typeof healthModule.init).toBe('function');
  });

  it('should initialize Redis on init', async () => {
    const initializeRedisSpy = jest.spyOn(HealthService, 'initializeRedis');

    if (healthModule.init) {
      await healthModule.init();
      expect(initializeRedisSpy).toHaveBeenCalled();
    }
  });
});
