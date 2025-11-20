import { logger } from '../../core/logger';

/**
 * Authentication Event Handlers
 * These handlers respond to authentication events
 */

/**
 * Handle user registration event
 */
export async function onUserRegistered(payload: {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  logger.info('New user registered', {
    userId: payload.userId,
    email: payload.email,
    fullName: `${payload.firstName} ${payload.lastName}`,
  });

  // Future enhancements (not implemented):
  // - Send welcome email using email service
  // - Create default user settings/preferences
  // - Track analytics event for user acquisition metrics
  // - Set up user onboarding workflow
}

/**
 * Handle user login event
 */
export async function onUserLogin(payload: { userId: string; email: string }) {
  logger.info('User login event', {
    userId: payload.userId,
    email: payload.email,
    timestamp: new Date().toISOString(),
  });

  // Future enhancements (not implemented):
  // - Update lastLoginAt timestamp in user table
  // - Track login analytics event (device, location, etc.)
  // - Send login notification email if suspicious activity detected
  // - Update user session tracking table
}

/**
 * Export all event handlers
 * Wrapped to match IModule events signature
 */
export const AuthEventHandlers: Record<string, (...args: unknown[]) => void | Promise<void>> = {
  'auth.registered': (...args: unknown[]) =>
    onUserRegistered(
      args[0] as {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
      }
    ),
  'auth.login': (...args: unknown[]) => onUserLogin(args[0] as { userId: string; email: string }),
};
