import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../store/auth.store';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  viewCount: number;
  createdAt: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PostsList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const { isAuthenticated } = useAuthStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', page, search, status],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(status && { status }),
      });

      const response = await apiClient.get<PostsResponse>(`/posts?${params}`);
      return response.data;
    },
  });

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error loading posts. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        {isAuthenticated && (
          <Link
            to="/posts/new"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Post
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading posts...</p>
        </div>
      ) : data?.posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No posts found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.posts.map((post) => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <h2 className="text-2xl font-semibold text-gray-900 hover:text-blue-600">
                  {post.title}
                </h2>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    post.status
                  )}`}
                >
                  {post.status}
                </span>
              </div>

              {post.excerpt && (
                <p className="text-gray-600 mb-4 line-clamp-2">{post.excerpt}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {post.author.firstName[0]}
                      {post.author.lastName[0]}
                    </span>
                  </div>
                  <span>
                    {post.author.firstName} {post.author.lastName}
                  </span>
                </div>
                <span>•</span>
                <span>
                  {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                </span>
                <span>•</span>
                <span>{post.viewCount} views</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing page {data.pagination.page} of {data.pagination.totalPages}
            {' '}({data.pagination.total} total posts)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
