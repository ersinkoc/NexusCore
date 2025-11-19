import { z } from 'zod';

import { EmailSchema } from './common.schema';

/**
 * User schemas
 */

export const UserRoleSchema = z.enum(['user', 'admin', 'moderator']);

export const CreateUserSchema = z.object({
  email: EmailSchema,
  password: z.string().min(8),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: UserRoleSchema.default('user'),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: EmailSchema.optional(),
  role: UserRoleSchema.optional(),
});

export const UserFilterSchema = z.object({
  role: UserRoleSchema.optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

// Type exports
// Note: UserRole is exported from common.ts as an enum
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type UserFilter = z.infer<typeof UserFilterSchema>;
