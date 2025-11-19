/**
 * Event type definitions for the Event Bus
 * Provides type-safe event payloads across the application
 */

import { UserRole } from './common';

/**
 * Authentication Events
 */
export interface AuthRegisteredEvent {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthLoginEvent {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthLogoutEvent {
  userId: string;
  email: string;
}

export interface AuthRefreshEvent {
  userId: string;
  email: string;
}

/**
 * User Events
 */
export interface UserCreatedEvent {
  userId: string;
  email: string;
  role: UserRole;
  createdBy: string;
}

export interface UserUpdatedEvent {
  userId: string;
  email: string;
  changes: Record<string, any>;
  updatedBy: string;
}

export interface UserDeletedEvent {
  userId: string;
  email: string;
  deletedBy: string;
}

export interface UserDeactivatedEvent {
  userId: string;
  email: string;
  deactivatedBy: string;
}

/**
 * Post Events
 */
export interface PostCreatedEvent {
  post: {
    id: string;
    title: string;
    slug: string;
    status: string;
    author: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  userId: string;
}

export interface PostUpdatedEvent {
  post: {
    id: string;
    title: string;
    slug: string;
    status: string;
    author: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  userId: string;
}

export interface PostPublishedEvent {
  post: {
    id: string;
    title: string;
    slug: string;
    publishedAt: Date | null;
    author: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  userId: string;
}

export interface PostDeletedEvent {
  postId: string;
  userId: string;
}

/**
 * System Events
 */
export interface SystemErrorEvent {
  error: Error;
  context?: string;
  correlationId?: string;
}

export interface SystemWarningEvent {
  message: string;
  context?: string;
}

/**
 * Event Map - Maps event names to their payload types
 * This enables type-safe event handling throughout the application
 */
export interface EventMap {
  // Authentication events
  'auth.registered': AuthRegisteredEvent;
  'auth.login': AuthLoginEvent;
  'auth.logout': AuthLogoutEvent;
  'auth.refresh': AuthRefreshEvent;

  // User events
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  'user.deleted': UserDeletedEvent;
  'user.deactivated': UserDeactivatedEvent;

  // Post events
  'post.created': PostCreatedEvent;
  'post.updated': PostUpdatedEvent;
  'post.published': PostPublishedEvent;
  'post.deleted': PostDeletedEvent;

  // System events
  'system.error': SystemErrorEvent;
  'system.warning': SystemWarningEvent;
}

/**
 * Extract event names from EventMap
 */
export type EventName = keyof EventMap;

/**
 * Get payload type for a specific event
 */
export type EventPayload<T extends EventName> = EventMap[T];

/**
 * Type-safe event handler
 */
export type TypedEventHandler<T extends EventName> = (payload: EventPayload<T>) => void | Promise<void>;
