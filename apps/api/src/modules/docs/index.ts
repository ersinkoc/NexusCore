import { IModule } from '@nexuscore/types';
import { logger } from '../../core/logger';
import DocsRoutes from './docs.routes';

/**
 * API Documentation Module
 *
 * Serves OpenAPI/Swagger documentation:
 * - GET /docs - Swagger UI interface
 * - GET /docs/json - OpenAPI spec as JSON
 */
export const DocsModule: IModule = {
  name: 'docs',
  routes: DocsRoutes,
  init: async () => {
    logger.info('API documentation module initialized');
    logger.info('Swagger UI available at /docs');
  },
};

export default DocsModule;
