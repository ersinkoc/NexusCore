import * as coreExports from '../index';

describe('Core Module Exports', () => {
  it('should export error classes', () => {
    expect(coreExports.AppError).toBeDefined();
    expect(coreExports.ValidationError).toBeDefined();
    expect(coreExports.UnauthorizedError).toBeDefined();
    expect(coreExports.NotFoundError).toBeDefined();
    expect(coreExports.ForbiddenError).toBeDefined();
  });

  it('should export event bus', () => {
    expect(coreExports.eventBus).toBeDefined();
  });

  it('should export logger', () => {
    expect(coreExports.logger).toBeDefined();
  });

  it('should export middleware', () => {
    expect(coreExports.errorHandler).toBeDefined();
    expect(coreExports.requestLogger).toBeDefined();
    expect(coreExports.notFoundHandler).toBeDefined();
  });

  it('should export ModuleLoader', () => {
    expect(coreExports.ModuleLoader).toBeDefined();
  });
});
