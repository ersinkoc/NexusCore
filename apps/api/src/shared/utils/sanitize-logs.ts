/**
 * Sanitize data for logging by removing sensitive fields
 * Prevents accidental logging of passwords, tokens, and other sensitive information
 */

const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'currentPassword',
  'oldPassword',
  'passwordConfirm',
  'token',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'authorization',
  'cookie',
  'set-cookie',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',
  'privateKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'socialSecurity',
  'pin',
];

/**
 * Recursively sanitize an object by replacing sensitive field values
 */
export function sanitizeForLogging<T = any>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitive types
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLogging(item)) as any;
  }

  // Handle objects
  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Check if field is sensitive
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Sanitize request object for logging
 */
export function sanitizeRequest(req: any): any {
  return {
    method: req.method,
    url: req.url,
    path: req.path,
    query: sanitizeForLogging(req.query),
    body: sanitizeForLogging(req.body),
    headers: sanitizeForLogging(req.headers),
    ip: req.ip,
    // Don't include cookies as they may contain tokens
  };
}

/**
 * Sanitize error object for logging
 */
export function sanitizeError(error: any): any {
  if (!error) return error;

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    // Sanitize any additional properties
    ...(error.details ? { details: sanitizeForLogging(error.details) } : {}),
  };
}
