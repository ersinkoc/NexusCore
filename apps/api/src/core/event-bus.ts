import { EventEmitter } from 'events';

import {
  IEventBus,
  EventHandler,
  GenericEventPayload,
  EventName,
  EventPayload,
  TypedEventHandler,
} from '@nexuscore/types';

import { logger } from './logger';

/**
 * Type-safe Event Bus implementation for decoupled module communication
 * Wraps Node.js EventEmitter with typed interface and logging
 *
 * Supports both typed events (via EventMap) and generic events for flexibility
 */
export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private handlerMap: WeakMap<EventHandler<any>, (...args: unknown[]) => void>;

  constructor() {
    this.emitter = new EventEmitter();
    // Configure max listeners from environment or use sensible default
    const maxListeners = process.env.EVENT_BUS_MAX_LISTENERS
      ? parseInt(process.env.EVENT_BUS_MAX_LISTENERS, 10)
      : 100;
    this.emitter.setMaxListeners(maxListeners);
    this.handlerMap = new WeakMap();
  }

  /**
   * Emit a typed event with payload
   * Use this for known events defined in EventMap
   */
  emitTyped<T extends EventName>(event: T, payload: EventPayload<T>): void {
    logger.debug(`Event emitted: ${event}`, { payload });
    this.emitter.emit(event, payload);
  }

  /**
   * Emit a generic event with payload (backward compatible)
   */
  emit<T = GenericEventPayload>(event: string, payload: T): void {
    logger.debug(`Event emitted: ${event}`, { payload });
    this.emitter.emit(event, payload);
  }

  /**
   * Subscribe to a typed event
   * Use this for known events defined in EventMap
   */
  onTyped<T extends EventName>(event: T, handler: TypedEventHandler<T>): void {
    logger.debug(`Event listener registered: ${event}`);
    const wrappedHandler = async (payload: EventPayload<T>) => {
      try {
        await handler(payload);
      } catch (error) {
        // Log errors but don't propagate to prevent one handler failure
        // from breaking other event handlers or the emitting code
        logger.error(`Error in event handler for "${event}":`, error);
      }
    };
    this.handlerMap.set(
      handler as EventHandler<any>,
      wrappedHandler as (...args: unknown[]) => void
    );
    this.emitter.on(event, wrappedHandler);
  }

  /**
   * Subscribe to a generic event (backward compatible)
   */
  on<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`Event listener registered: ${event}`);
    const wrappedHandler = async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        // Log errors but don't propagate to prevent one handler failure
        // from breaking other event handlers or the emitting code
        logger.error(`Error in event handler for "${event}":`, error);
      }
    };
    this.handlerMap.set(
      handler as EventHandler<any>,
      wrappedHandler as (...args: unknown[]) => void
    );
    this.emitter.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`Event listener removed: ${event}`);
    const wrappedHandler = this.handlerMap.get(handler as EventHandler<any>);
    if (wrappedHandler) {
      this.emitter.off(event, wrappedHandler);
      this.handlerMap.delete(handler as EventHandler<any>);
    }
  }

  /**
   * Subscribe to an event (fires only once)
   */
  once<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`One-time event listener registered: ${event}`);
    const wrappedHandler = async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        // Log errors but don't propagate to prevent one handler failure
        // from breaking other event handlers or the emitting code
        logger.error(`Error in one-time event handler for "${event}":`, error);
      } finally {
        // Clean up from handlerMap after execution
        this.handlerMap.delete(handler as EventHandler<any>);
      }
    };
    // Store in handlerMap for proper cleanup
    this.handlerMap.set(
      handler as EventHandler<any>,
      wrappedHandler as (...args: unknown[]) => void
    );
    this.emitter.once(event, wrappedHandler);
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
