import { IModule } from '../../core/module-loader';
import { logger } from '../../core/logger';
import HealthRoutes from './health.routes';
import { HealthService } from './health.service';

/**
 * Health Check Module
 *
 * Provides health check endpoints for monitoring and orchestration:
 * - GET /health - Comprehensive health check
 * - GET /health/live - Liveness probe
 * - GET /health/ready - Readiness probe
 */
export const HealthModule: IModule = {
  name: 'health',
  routes: HealthRoutes,
  init: async () => {
    // Initialize Redis connection for health checks
    HealthService.initializeRedis();
    logger.info('Health module initialized');
  },
};

export default HealthModule;
