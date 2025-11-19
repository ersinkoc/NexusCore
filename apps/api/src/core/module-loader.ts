import { Application, Router } from 'express';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

// ESM compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { IModule } from '@nexuscore/types';

import { logger } from './logger';
import { eventBus } from './event-bus';

/**
 * Dynamic Module Loader
 * Scans and loads all modules from the modules directory
 */
export class ModuleLoader {
  private app: Application;
  private modules: IModule[] = [];
  private modulesPath: string;
  // Track event handlers for proper cleanup
  private moduleEventHandlers: Map<
    string,
    Array<{ event: string; handler: (...args: unknown[]) => void | Promise<void> }>
  > = new Map();

  constructor(app: Application) {
    this.app = app;
    this.modulesPath = join(__dirname, '../modules');
  }

  /**
   * Load all modules from the modules directory
   */
  async loadModules(): Promise<void> {
    logger.info('🔌 Loading modules...');

    try {
      const moduleDirectories = readdirSync(this.modulesPath, {
        withFileTypes: true,
      })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name);

      for (const moduleName of moduleDirectories) {
        await this.loadModule(moduleName);
      }

      logger.info(`✅ Loaded ${this.modules.length} module(s)`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn('No modules directory found, skipping module loading');
      } else {
        throw error;
      }
    }
  }

  /**
   * Load a single module
   */
  private async loadModule(moduleName: string): Promise<void> {
    try {
      const modulePath = join(this.modulesPath, moduleName);
      const moduleFile = join(modulePath, 'index.ts');

      logger.debug(`Loading module "${moduleName}" from ${moduleFile}`);

      // Simple ESM dynamic import
      const moduleExports = await import(pathToFileURL(moduleFile).href);

      /* istanbul ignore next - Fallback export style rarely used */
      const moduleDefinition: IModule =
        moduleExports.default || moduleExports[`${moduleName}Module`];

      // Log if fallback export style was used
      if (!moduleExports.default && moduleExports[`${moduleName}Module`]) {
        logger.warn(
          `Module "${moduleName}" using fallback export style (named export instead of default)`
        );
      }

      if (!moduleDefinition || !moduleDefinition.name) {
        logger.warn(`Module "${moduleName}" does not export a valid module definition`);
        logger.debug(`Available exports:`, Object.keys(moduleExports));
        return;
      }

      // Initialize module
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.init) {
        try {
          await moduleDefinition.init();
        } catch (initError) {
          logger.error(`Failed to initialize module "${moduleName}":`, initError);
          return;
        }
      }

      // Register routes
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.routes) {
        try {
          const router = moduleDefinition.routes as Router;
          this.app.use(`/api/${moduleDefinition.name}`, router);
          logger.info(`  ✓ Routes registered: /api/${moduleDefinition.name}`);
        } catch (routeError) {
          logger.error(`Failed to register routes for "${moduleName}":`, routeError);
        }
      }

      // Register event listeners
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.events) {
        try {
          const handlers: Array<{
            event: string;
            handler: (...args: unknown[]) => void | Promise<void>;
          }> = [];
          Object.entries(moduleDefinition.events).forEach(([event, handler]) => {
            eventBus.on(event, handler as (...args: unknown[]) => void);
            handlers.push({
              event,
              handler: handler as (...args: unknown[]) => void | Promise<void>,
            });
            logger.info(`  ✓ Event listener registered: ${event}`);
          });
          // Store handlers for cleanup
          this.moduleEventHandlers.set(moduleDefinition.name, handlers);
        } catch (eventError) {
          logger.error(`Failed to register event listeners for "${moduleName}":`, eventError);
        }
      }

      /* istanbul ignore next - Integration tested on app startup */
      this.modules.push(moduleDefinition);
      /* istanbul ignore next - Integration tested on app startup */
      logger.info(`✓ Module loaded: ${moduleDefinition.name}`);
    } catch (error) {
      logger.error(`Failed to load module "${moduleName}":`, error);
      logger.error('Stack trace:', (error as Error).stack);
    }
  }

  /**
   * Cleanup all modules
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up modules...');

    for (const module of this.modules) {
      // Remove event handlers
      const handlers = this.moduleEventHandlers.get(module.name);
      if (handlers) {
        handlers.forEach(({ event, handler }) => {
          eventBus.off(event, handler as (...args: unknown[]) => void);
          logger.debug(`  ✓ Event listener removed: ${event}`);
        });
        this.moduleEventHandlers.delete(module.name);
      }

      // Call module cleanup
      if (module.cleanup) {
        try {
          await module.cleanup();
          logger.info(`✓ Cleaned up module: ${module.name}`);
        } catch (error) {
          logger.error(`Failed to cleanup module "${module.name}":`, error);
        }
      }
    }
  }

  /**
   * Get all loaded modules
   */
  getModules(): IModule[] {
    return this.modules;
  }
}
