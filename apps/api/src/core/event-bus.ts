import { EventEmitter } from 'events';

import { IEventBus, EventHandler, EventPayload } from '@nexuscore/types';

import { logger } from './logger';

/**
 * Event Bus implementation for decoupled module communication
 * Wraps Node.js EventEmitter with typed interface and logging
 */
export class EventBus implements IEventBus {
  private emitter: EventEmitter;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Increase for multiple modules
  }

  /**
   * Emit an event with payload
   */
  emit<T = EventPayload>(event: string, payload: T): void {
    logger.debug(`Event emitted: ${event}`, { payload });
    this.emitter.emit(event, payload);
  }

  /**
   * Subscribe to an event
   */
  on<T = EventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`Event listener registered: ${event}`);
    this.emitter.on(event, async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error(`Error in event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Unsubscribe from an event
   */
  off<T = EventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`Event listener removed: ${event}`);
    this.emitter.off(event, handler as (...args: unknown[]) => void);
  }

  /**
   * Subscribe to an event (fires only once)
   */
  once<T = EventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`One-time event listener registered: ${event}`);
    this.emitter.once(event, async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        logger.error(`Error in one-time event handler for "${event}":`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      logger.debug(`All listeners removed for event: ${event}`);
      this.emitter.removeAllListeners(event);
    } else {
      logger.debug('All event listeners removed');
      this.emitter.removeAllListeners();
    }
  }
}

// Singleton instance
export const eventBus = new EventBus();
