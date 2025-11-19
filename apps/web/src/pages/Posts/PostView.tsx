import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';
import { UserRole } from '@nexuscore/types';

interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  viewCount: number;
  metaTitle: string | null;
  metaDescription: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await apiClient.get<Post>(`/posts/${id}`);
      return response.data;
    },
    enabled: !!id,
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/posts/${id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate('/posts');
    },
  });

  const handlePublish = () => {
    if (confirm('Are you sure you want to publish this post?')) {
      publishMutation.mutate();
    }
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const canEdit =
    isAuthenticated && (user?.userId === post?.author.id || user?.role === UserRole.ADMIN);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const sanitizeContent = (content: string) => {
    // Replace newlines with <br /> tags, then sanitize to prevent XSS
    const htmlContent = content.replace(/\n/g, '<br />');
    return DOMPurify.sanitize(htmlContent, {
      ALLOWED_TAGS: ['br', 'p', 'b', 'i', 'em', 'strong', 'u', 'a'],
      ALLOWED_ATTR: ['href', 'target', 'rel'],
    });
  };

  const getInitials = (firstName: string, lastName: string) => {
    const first = firstName && firstName.length > 0 ? firstName[0].toUpperCase() : '';
    const last = lastName && lastName.length > 0 ? lastName[0].toUpperCase() : '';
    return first && last ? `${first}${last}` : first || last || '?';
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading post. It may have been deleted or you don't have permission to view it.
        </div>
        <Link to="/posts" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Back to posts
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="mt-2 text-gray-600">Loading post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Post not found.</p>
          <Link to="/posts" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Back to posts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/posts" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to posts
        </Link>
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-gray-900">{post.title}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}
              >
                {post.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-medium">
                    {getInitials(post.author.firstName, post.author.lastName)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {post.author.firstName} {post.author.lastName}
                  </div>
                  <div className="text-xs">
                    {post.publishedAt
                      ? `Published ${formatDate(post.publishedAt)}`
                      : `Created ${formatDate(post.createdAt)}`}
                  </div>
                </div>
              </div>
              <span>•</span>
              <span>{post.viewCount} views</span>
            </div>
          </div>

          {/* Actions */}
          {canEdit && (
            <div className="flex gap-2">
              {post.status === 'DRAFT' && (
                <button
                  onClick={handlePublish}
                  disabled={publishMutation.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {publishMutation.isPending ? 'Publishing...' : 'Publish'}
                </button>
              )}
              <Link
                to={`/posts/${post.id}/edit`}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Edit
              </Link>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <article className="prose prose-lg max-w-none">
        <div
          className="whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: sanitizeContent(post.content) }}
        />
      </article>

      {/* Metadata */}
      {post.metaTitle || post.metaDescription ? (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">SEO Metadata</h3>
          {post.metaTitle && (
            <div className="mb-2">
              <span className="text-xs font-medium text-gray-500">Meta Title:</span>
              <p className="text-sm text-gray-700">{post.metaTitle}</p>
            </div>
          )}
          {post.metaDescription && (
            <div>
              <span className="text-xs font-medium text-gray-500">Meta Description:</span>
              <p className="text-sm text-gray-700">{post.metaDescription}</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="text-xs text-gray-500">Last updated: {formatDate(post.updatedAt)}</div>
      </div>
    </div>
  );
}
