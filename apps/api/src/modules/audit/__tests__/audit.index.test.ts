// Mock all dependencies before importing the module
jest.mock('@nexuscore/db', () => ({
  prisma: {},
}));

jest.mock('../../../shared/services', () => ({
  AuditService: {},
}));

jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../auth/auth.middleware', () => ({
  requireAuth: jest.fn(),
}));

import auditModule from '../index';

describe('Audit Module', () => {
  it('should export module with correct structure', () => {
    expect(auditModule).toBeDefined();
    expect(auditModule.name).toBe('audit');
    expect(auditModule.routes).toBeDefined();
  });

  it('should have valid routes', () => {
    expect(auditModule.routes).toBeInstanceOf(Function);
    // Router is a function in Express
    expect(typeof auditModule.routes).toBe('function');
  });

  it('should not have init or cleanup methods', () => {
    expect((auditModule as any).init).toBeUndefined();
    expect((auditModule as any).cleanup).toBeUndefined();
  });

  it('should not have events', () => {
    expect((auditModule as any).events).toBeUndefined();
  });
});
