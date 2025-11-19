/**
 * API-specific types
 */

import { Request } from 'express';

import { JWTPayload } from './common';

/**
 * Authenticated Request with user context
 */
export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
  correlationId?: string;
}

/**
 * Module definition interface
 */
export interface IModule {
  name: string;
  routes?: unknown; // Express Router
  events?: Record<string, (...args: unknown[]) => void | Promise<void>>;
  init?: () => Promise<void> | void;
  cleanup?: () => Promise<void> | void;
}

/**
 * Event Bus types
 * Note: EventPayload is exported from events.ts for type-safe events
 * This is the generic version for backward compatibility
 */
export interface GenericEventPayload {
  [key: string]: unknown;
}

export type EventHandler<T = GenericEventPayload> = (payload: T) => void | Promise<void>;

export interface IEventBus {
  emit<T = GenericEventPayload>(event: string, payload: T): void;
  on<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void;
  off<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void;
  once<T = GenericEventPayload>(event: string, handler: EventHandler<T>): void;
}
