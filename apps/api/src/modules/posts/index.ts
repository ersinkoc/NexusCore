import { IModule } from '../../core/module-loader';
import { logger } from '../../core/logger';
import PostsRoutes from './posts.routes';
import { PostEventHandlers } from './posts.events';

/**
 * Posts Module (Example CRUD Module)
 *
 * Demonstrates:
 * - Full CRUD operations
 * - Event-driven architecture
 * - Authorization (owner/admin permissions)
 * - Validation with Zod
 * - Pagination and filtering
 * - Slug generation
 * - View counting
 * - Audit logging
 *
 * Endpoints:
 * - GET    /posts           - List posts (public)
 * - POST   /posts           - Create post (auth required)
 * - GET    /posts/:id       - Get post by ID (public)
 * - PUT    /posts/:id       - Update post (owner/admin)
 * - DELETE /posts/:id       - Delete post (owner/admin)
 * - POST   /posts/:id/publish - Publish post (owner/admin)
 */
export const PostsModule: IModule = {
  name: 'posts',
  routes: PostsRoutes,
  events: PostEventHandlers,
  init: async () => {
    logger.info('Posts module initialized');
  },
};

export default PostsModule;
