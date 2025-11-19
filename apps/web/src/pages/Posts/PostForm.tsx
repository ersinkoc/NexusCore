import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

const postSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt is too long').optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  metaTitle: z.string().max(60, 'Meta title is too long').optional(),
  metaDescription: z.string().max(160, 'Meta description is too long').optional(),
});

type PostFormData = z.infer<typeof postSchema>;

interface Post {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  metaTitle: string | null;
  metaDescription: string | null;
}

export default function PostForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = id !== 'new' && !!id;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      status: 'DRAFT',
    },
  });

  // Fetch post data if editing
  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await apiClient.get<Post>(`/posts/${id}`);
      return response.data;
    },
    enabled: isEditMode,
  });

  // Reset form when post data loads
  useEffect(() => {
    if (post) {
      reset({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        status: post.status,
        metaTitle: post.metaTitle || '',
        metaDescription: post.metaDescription || '',
      });
    }
  }, [post, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await apiClient.post('/posts', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/posts/${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: PostFormData) => {
      const response = await apiClient.put(`/posts/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/posts/${data.id}`);
    },
  });

  const onSubmit = async (data: PostFormData) => {
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync(data);
      } else {
        await createMutation.mutateAsync(data);
      }
    } catch (error: any) {
      console.error('Error saving post:', error);
      alert(error?.response?.data?.error || 'Failed to save post');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">
        {isEditMode ? 'Edit Post' : 'Create New Post'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter post title"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            {...register('excerpt')}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Brief summary of the post (optional)"
          />
          {errors.excerpt && (
            <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>
          )}
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
            Content *
          </label>
          <textarea
            id="content"
            {...register('content')}
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Write your post content here... (Markdown supported)"
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status *
          </label>
          <select
            id="status"
            {...register('status')}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* SEO Section */}
        <div className="border-t pt-6">
          <h2 className="text-lg font-semibold mb-4">SEO Metadata</h2>

          {/* Meta Title */}
          <div className="mb-4">
            <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Meta Title
            </label>
            <input
              id="metaTitle"
              type="text"
              {...register('metaTitle')}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SEO title (max 60 characters)"
            />
            {errors.metaTitle && (
              <p className="mt-1 text-sm text-red-600">{errors.metaTitle.message}</p>
            )}
          </div>

          {/* Meta Description */}
          <div>
            <label
              htmlFor="metaDescription"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Meta Description
            </label>
            <textarea
              id="metaDescription"
              {...register('metaDescription')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SEO description (max 160 characters)"
            />
            {errors.metaDescription && (
              <p className="mt-1 text-sm text-red-600">{errors.metaDescription.message}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/posts')}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Post' : 'Create Post'}
          </button>
        </div>
      </form>
    </div>
  );
}
