import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import { PostsList, PostView, PostForm } from './pages/Posts';
import DashboardLayout from './components/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { UserRole } from '@nexuscore/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Posts routes (public for viewing, protected for editing) */}
          <Route path="/posts" element={<PostsList />} />
          <Route path="/posts/:id" element={<PostView />} />
          <Route
            path="/posts/:id/edit"
            element={
              <ProtectedRoute>
                <PostForm />
              </ProtectedRoute>
            }
          />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.MODERATOR]}>
                  <Users />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Redirect root to posts */}
          <Route path="/" element={<Navigate to="/posts" replace />} />

          {/* 404 */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-xl text-gray-600 mb-8">Page not found</p>
                  <a
                    href="/dashboard"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
