import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth.store';
import { authApi } from '../lib/api';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      navigate('/login');
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-gray-900">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 bg-gray-800">
            <h1 className="text-xl font-bold text-white">NexusCore</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition"
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Dashboard
            </Link>

            <Link
              to="/posts"
              className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition"
            >
              <svg
                className="w-5 h-5 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              Posts
            </Link>

            {(user?.role === 'ADMIN' || user?.role === 'MODERATOR') && (
              <Link
                to="/dashboard/users"
                className="flex items-center px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Users
              </Link>
            )}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full flex items-center justify-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition disabled:opacity-50"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
