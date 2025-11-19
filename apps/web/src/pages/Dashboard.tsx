import { useAuthStore } from '../store/auth.store';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Welcome</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">{user?.email}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Role</p>
              <p className="text-2xl font-semibold text-gray-900 capitalize">{user?.role}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className="text-2xl font-semibold text-green-600">Active</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Getting Started</h2>
        <div className="prose max-w-none">
          <p className="text-gray-600 mb-4">
            Welcome to NexusCore! This is a production-ready, modular, event-driven full-stack
            boilerplate built with:
          </p>
          <ul className="space-y-2 text-gray-600">
            <li>✅ Node.js + Express backend with TypeScript</li>
            <li>✅ React 18 + Vite frontend</li>
            <li>✅ PostgreSQL + Prisma ORM</li>
            <li>✅ JWT Authentication with RBAC</li>
            <li>✅ Event-driven modular architecture</li>
            <li>✅ Turborepo monorepo structure</li>
          </ul>

          {(user?.role === 'admin' || user?.role === 'moderator') && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-blue-900 font-medium">Admin Access</p>
              <p className="text-blue-700 text-sm mt-1">
                As an admin/moderator, you can manage users from the Users page in the sidebar.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
