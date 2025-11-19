import { z } from 'zod';

/**
 * Common validation schemas
 */

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const EmailSchema = z.string().email('Invalid email address').toLowerCase();

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must not exceed 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export type PaginationInput = z.infer<typeof PaginationSchema>;
export type IdParam = z.infer<typeof IdParamSchema>;
