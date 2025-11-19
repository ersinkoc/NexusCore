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
 */
export interface EventPayload {
  [key: string]: unknown;
}

export type EventHandler<T = EventPayload> = (payload: T) => void | Promise<void>;

export interface IEventBus {
  emit<T = EventPayload>(event: string, payload: T): void;
  on<T = EventPayload>(event: string, handler: EventHandler<T>): void;
  off<T = EventPayload>(event: string, handler: EventHandler<T>): void;
  once<T = EventPayload>(event: string, handler: EventHandler<T>): void;
}
