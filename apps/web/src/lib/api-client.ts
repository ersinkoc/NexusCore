import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

/**
 * API Client with automatic token refresh
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for refresh token
});

// Request interceptor - Add access token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh with promise-based lock
let refreshingPromise: Promise<string> | null = null;

const refreshToken = async (): Promise<string> => {
  // If already refreshing, return the existing promise
  if (refreshingPromise) {
    return refreshingPromise;
  }

  // Create new refresh promise
  refreshingPromise = (async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
      const { accessToken } = response.data.data;

      // Store new access token
      localStorage.setItem('accessToken', accessToken);

      return accessToken;
    } catch (error) {
      // Refresh failed - clear auth and redirect to login
      localStorage.removeItem('accessToken');
      const basePath = import.meta.env.BASE_URL || '/';
      window.location.href = `${basePath}login`.replace('//', '/');
      throw error;
    } finally {
      // Clear the promise after completion (success or failure)
      refreshingPromise = null;
    }
  })();

  return refreshingPromise;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token (uses promise-based lock to prevent concurrent refreshes)
        const accessToken = await refreshToken();

        // Update authorization header with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }

        // Retry original request with new token
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed - error already handled in refreshToken()
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
