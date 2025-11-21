import { IModule } from '@nexuscore/types';

import { logger } from '../../core/logger';

import UsersRoutes from './users.routes';

/**
 * Users Module
 * Handles user management operations (CRUD)
 * Demonstrates RBAC with different permission levels
 */
const UsersModule: IModule = {
  name: 'users',
  routes: UsersRoutes,
  init: async () => {
    logger.info('Users module initialized');
  },
  cleanup: async () => {
    logger.info('Users module cleanup');
  },
};

export * from './users.service';

// Named export for tests and direct imports
export { UsersModule };

// Default export for module loader
export default UsersModule;
