import { z } from 'zod';

/**
 * Post status enum
 */
export enum PostStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Create post schema
 */
export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  status: z.nativeEnum(PostStatus).default(PostStatus.DRAFT),
  metaTitle: z.string().max(60, 'Meta title too long').optional(),
  metaDescription: z.string().max(160, 'Meta description too long').optional(),
  publishedAt: z.coerce.date().optional(),
});

/**
 * Update post schema
 */
export const updatePostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  status: z.nativeEnum(PostStatus).optional(),
  metaTitle: z.string().max(60, 'Meta title too long').optional(),
  metaDescription: z.string().max(160, 'Meta description too long').optional(),
  publishedAt: z.coerce.date().optional().nullable(),
});

/**
 * Query posts schema
 */
export const queryPostsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  status: z.nativeEnum(PostStatus).optional(),
  authorId: z.string().uuid().optional(),
  search: z.string().optional(),
});

/**
 * Path parameter schemas for validation
 */
export const postIdParamSchema = z.object({
  id: z.string().uuid('Invalid post ID format'),
});

export const postSlugParamSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(255, 'Slug too long')
    // Updated regex to match generated slug format: base-slug-timestamp-randomhex
    // Example: my-post-title-1732204800000-a1b2c3d4
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*-\d+-[a-f0-9]{8}$/, 'Invalid slug format'),
});

/**
 * Type exports
 */
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type QueryPostsInput = z.infer<typeof queryPostsSchema>;
export type PostIdParam = z.infer<typeof postIdParamSchema>;
export type PostSlugParam = z.infer<typeof postSlugParamSchema>;
