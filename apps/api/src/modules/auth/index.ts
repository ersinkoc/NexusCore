import { IModule } from '@nexuscore/types';

import { logger } from '../../core/logger';

import AuthRoutes from './auth.routes';
import { AuthEventHandlers } from './auth.events';

/**
 * Authentication Module
 * Handles user registration, login, logout, and JWT token management
 */
const AuthModule: IModule = {
  name: 'auth',
  routes: AuthRoutes,
  events: AuthEventHandlers,
  init: async () => {
    logger.info('Auth module initialized');
  },
  cleanup: async () => {
    logger.info('Auth module cleanup');
  },
};

// Export middleware for use in other modules
export * from './auth.middleware';
export * from './auth.service';

// Default export for module loader
export default AuthModule;
