import { logger } from '../logger';

describe('Logger', () => {
  describe('logger instance', () => {
    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(logger.debug).toBeDefined();
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('logging methods', () => {
    it('should be able to log info messages', () => {
      expect(() => logger.info('Test info message')).not.toThrow();
    });

    it('should be able to log error messages', () => {
      expect(() => logger.error('Test error message')).not.toThrow();
    });

    it('should be able to log warn messages', () => {
      expect(() => logger.warn('Test warning message')).not.toThrow();
    });

    it('should be able to log debug messages', () => {
      expect(() => logger.debug('Test debug message')).not.toThrow();
    });

    it('should be able to log with metadata objects', () => {
      expect(() =>
        logger.info('Test with metadata', { userId: '123', action: 'test' })
      ).not.toThrow();
    });

    it('should be able to log errors with stack traces', () => {
      const error = new Error('Test error');
      expect(() => logger.error('Error occurred', { error })).not.toThrow();
    });

    it('should handle logging multiple arguments', () => {
      expect(() => logger.info('Multiple', { arg1: 'value1' }, { arg2: 'value2' })).not.toThrow();
    });

    it('should handle logging empty messages', () => {
      expect(() => logger.info('')).not.toThrow();
    });

    it('should handle logging with null metadata', () => {
      expect(() => logger.info('Test', null as any)).not.toThrow();
    });

    it('should handle logging with undefined metadata', () => {
      expect(() => logger.info('Test', undefined)).not.toThrow();
    });
  });

  describe('logger configuration', () => {
    it('should have exception handler configured', () => {
      expect(logger.exceptions).toBeDefined();
    });

    it('should have rejection handler configured', () => {
      expect(logger.rejections).toBeDefined();
    });

    it('should have transports configured', () => {
      expect(logger.transports).toBeDefined();
      expect(logger.transports.length).toBeGreaterThan(0);
    });

    it('should have log level configured', () => {
      expect(logger.level).toBeDefined();
      expect(typeof logger.level).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should log errors with message and stack', () => {
      const error = new Error('Test error with stack');
      expect(() => logger.error(error.message, { stack: error.stack })).not.toThrow();
    });

    it('should log errors with additional context', () => {
      const error = new Error('Context error');
      expect(() =>
        logger.error('Operation failed', {
          error,
          userId: '123',
          operation: 'test',
        })
      ).not.toThrow();
    });

    it('should handle large objects', () => {
      const largeObj = {
        name: 'test',
        data: Array(100).fill({ id: 1, value: 'test' }),
        nested: {
          level1: {
            level2: {
              level3: 'deep value',
            },
          },
        },
      };

      expect(() => logger.info('Large object test', { data: largeObj })).not.toThrow();
    });
  });
});
