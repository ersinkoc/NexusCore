import * as middlewareExports from '../index';

describe('Middleware Module Exports', () => {
  it('should export errorHandler', () => {
    expect(middlewareExports.errorHandler).toBeDefined();
    expect(typeof middlewareExports.errorHandler).toBe('function');
  });

  it('should export requestLogger', () => {
    expect(middlewareExports.requestLogger).toBeDefined();
    expect(typeof middlewareExports.requestLogger).toBe('function');
  });

  it('should export notFoundHandler', () => {
    expect(middlewareExports.notFoundHandler).toBeDefined();
    expect(typeof middlewareExports.notFoundHandler).toBe('function');
  });
});
