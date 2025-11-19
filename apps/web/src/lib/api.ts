import { LoginInput, RegisterInput } from '@nexuscore/types';

import apiClient from './api-client';

/**
 * API Service Functions
 */

// Auth API
export const authApi = {
  register: async (data: RegisterInput) => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginInput) => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refresh: async () => {
    const response = await apiClient.post('/auth/refresh');
    return response.data;
  },

  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
  }) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getUserById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: { firstName?: string; lastName?: string; role?: string }) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },

  deactivateUser: async (id: string) => {
    const response = await apiClient.post(`/users/${id}/deactivate`);
    return response.data;
  },
};
