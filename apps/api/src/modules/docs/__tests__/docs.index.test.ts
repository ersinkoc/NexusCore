// Mock logger before importing
jest.mock('../../../core/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { DocsModule } from '../index';
import { logger } from '../../../core/logger';

describe('Docs Module Index', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should export module definition', () => {
    expect(DocsModule).toBeDefined();
    expect(DocsModule.name).toBe('docs');
  });

  it('should export default module', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const docsModule = require('../index').default;
    expect(docsModule).toBeDefined();
    expect(docsModule.name).toBe('docs');
  });

  it('should have routes', () => {
    expect(DocsModule.routes).toBeDefined();
  });

  it('should have init function', () => {
    expect(DocsModule.init).toBeDefined();
    expect(typeof DocsModule.init).toBe('function');
  });

  it('should initialize and log documentation availability', async () => {
    if (DocsModule.init) {
      await DocsModule.init();

      expect(logger.info).toHaveBeenCalledWith('API documentation module initialized');
      expect(logger.info).toHaveBeenCalledWith('Swagger UI available at /docs');
    }
  });
});
