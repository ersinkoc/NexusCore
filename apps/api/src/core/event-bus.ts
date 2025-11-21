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
 * Configuration for event handler retry mechanism
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Type-safe Event Bus implementation with retry mechanism
 * Wraps Node.js EventEmitter with typed interface, logging, and automatic retries
 *
 * Features:
 * - Typed and generic event support
 * - Automatic retry with exponential backoff for failed handlers
 * - Dead-letter queue support for persistent failures
 * - Configurable via environment variables
 */
export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private handlerMap: WeakMap<EventHandler<any>, (...args: unknown[]) => void>;
  private retryConfig: RetryConfig;
  private deadLetterQueue: Array<{ event: string; payload: unknown; error: Error }> = [];

  constructor() {
    this.emitter = new EventEmitter();

    // Configure max listeners from environment or use sensible default
    const maxListeners = process.env.EVENT_BUS_MAX_LISTENERS
      ? parseInt(process.env.EVENT_BUS_MAX_LISTENERS, 10)
      : 100;
    this.emitter.setMaxListeners(maxListeners);

    this.handlerMap = new WeakMap();

    // Configure retry mechanism from environment or use defaults
    this.retryConfig = {
      maxRetries: process.env.EVENT_BUS_MAX_RETRIES
        ? parseInt(process.env.EVENT_BUS_MAX_RETRIES, 10)
        : 3,
      initialDelayMs: process.env.EVENT_BUS_INITIAL_RETRY_DELAY_MS
        ? parseInt(process.env.EVENT_BUS_INITIAL_RETRY_DELAY_MS, 10)
        : 100,
      maxDelayMs: process.env.EVENT_BUS_MAX_RETRY_DELAY_MS
        ? parseInt(process.env.EVENT_BUS_MAX_RETRY_DELAY_MS, 10)
        : 5000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Retry handler with exponential backoff
   */
  private async retryWithBackoff<T>(
    handler: () => Promise<void>,
    event: string,
    payload: T,
    attempt = 0
  ): Promise<void> {
    try {
      await handler();
    } catch (error) {
      const isLastAttempt = attempt >= this.retryConfig.maxRetries;

      if (isLastAttempt) {
        // All retries exhausted - add to dead-letter queue
        logger.error(
          `Event handler failed after ${this.retryConfig.maxRetries} retries: "${event}"`,
          { error, payload, attempts: attempt + 1 }
        );

        // Store in dead-letter queue for manual processing
        this.deadLetterQueue.push({
          event,
          payload,
          error: error instanceof Error ? error : new Error(String(error)),
        });

        // Emit dead-letter event for monitoring/alerting
        this.emitter.emit('eventbus.deadletter', {
          event,
          payload,
          error,
          attempts: attempt + 1,
        });

        return;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.retryConfig.initialDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
        this.retryConfig.maxDelayMs
      );

      logger.warn(
        `Event handler failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries}): "${event}"`,
        { error, payload }
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry
      await this.retryWithBackoff(handler, event, payload, attempt + 1);
    }
  }

  /**
   * Get failed events from dead-letter queue (for monitoring/manual retry)
   */
  getDeadLetterQueue(): Array<{ event: string; payload: unknown; error: Error }> {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead-letter queue
   */
  clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
    logger.info('Dead-letter queue cleared');
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
   * Subscribe to a typed event with automatic retry
   * Use this for known events defined in EventMap
   */
  onTyped<T extends EventName>(event: T, handler: TypedEventHandler<T>): void {
    logger.debug(`Event listener registered: ${event}`);
    const wrappedHandler = async (payload: EventPayload<T>) => {
      // Wrap handler execution with retry mechanism
      await this.retryWithBackoff(
        async () => {
          await handler(payload);
        },
        event,
        payload
      );
    };
    this.handlerMap.set(
      handler as EventHandler<any>,
      wrappedHandler as (...args: unknown[]) => void
    );
    this.emitter.on(event, wrappedHandler);
  }

  /**
   * Subscribe to a generic event with automatic retry (backward compatible)
   */
  on<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`Event listener registered: ${event}`);
    const wrappedHandler = async (payload: T) => {
      // Wrap handler execution with retry mechanism
      await this.retryWithBackoff(
        async () => {
          await handler(payload);
        },
        event,
        payload
      );
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
   * Subscribe to an event with automatic retry (fires only once)
   */
  once<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void {
    logger.debug(`One-time event listener registered: ${event}`);
    const wrappedHandler = async (payload: T) => {
      try {
        // Wrap handler execution with retry mechanism
        await this.retryWithBackoff(
          async () => {
            await handler(payload);
          },
          event,
          payload
        );
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
