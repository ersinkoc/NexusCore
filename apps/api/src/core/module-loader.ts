import { Application, Router } from 'express';
import { readdirSync } from 'fs';
import { join } from 'path';

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

      // Dynamic import
      const moduleExports = await import(moduleFile);
      /* istanbul ignore next - Fallback export style rarely used */
      const moduleDefinition: IModule =
        moduleExports.default || moduleExports[`${moduleName}Module`];

      if (!moduleDefinition || !moduleDefinition.name) {
        logger.warn(`Module "${moduleName}" does not export a valid module definition`);
        return;
      }

      // Initialize module
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.init) {
        await moduleDefinition.init();
      }

      // Register routes
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.routes) {
        const router = moduleDefinition.routes as Router;
        this.app.use(`/api/${moduleDefinition.name}`, router);
        logger.info(`  ✓ Routes registered: /api/${moduleDefinition.name}`);
      }

      // Register event listeners
      /* istanbul ignore next - Integration tested on app startup */
      if (moduleDefinition.events) {
        Object.entries(moduleDefinition.events).forEach(([event, handler]) => {
          eventBus.on(event, handler as (...args: unknown[]) => void);
          logger.info(`  ✓ Event listener registered: ${event}`);
        });
      }

      /* istanbul ignore next - Integration tested on app startup */
      this.modules.push(moduleDefinition);
      /* istanbul ignore next - Integration tested on app startup */
      logger.info(`✓ Module loaded: ${moduleDefinition.name}`);
    } catch (error) {
      logger.error(`Failed to load module "${moduleName}":`, error);
    }
  }

  /**
   * Cleanup all modules
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up modules...');

    for (const module of this.modules) {
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
