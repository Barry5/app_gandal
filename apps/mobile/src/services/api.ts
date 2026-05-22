import axios, { AxiosInstance, AxiosError } from 'axios';
import { useAuthStore } from '../store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    role?: 'creator' | 'learner';
    businessName?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const courseService = {
  getAll: async (params?: { page?: number; limit?: number; category?: string }) => {
    const response = await api.get('/courses', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    difficulty?: string;
    priceCfa?: number;
  }) => {
    const response = await api.post('/courses', data);
    return response.data;
  },

  update: async (id: string, data: Partial<{
    title: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    difficulty?: string;
    priceCfa?: number;
    status?: string;
  }>) => {
    const response = await api.put(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete(`/courses/${id}`);
    return response.data;
  },

  publish: async (id: string) => {
    const response = await api.post(`/courses/${id}/publish`);
    return response.data;
  },

  getModules: async (courseId: string) => {
    const response = await api.get(`/courses/${courseId}`);
    return response.data;
  },

  createModule: async (courseId: string, data: { title: string; description?: string }) => {
    const response = await api.post(`/courses/${courseId}/modules`, data);
    return response.data;
  },

  createLesson: async (moduleId: string, data: {
    title: string;
    type: 'video' | 'text' | 'pdf' | 'quiz';
    description?: string;
    contentUrl?: string;
    durationSec?: number;
    isFree?: boolean;
  }) => {
    const response = await api.post(`/modules/${moduleId}/lessons`, data);
    return response.data;
  },
};

export const userService = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: { name?: string; phone?: string; avatarUrl?: string }) => {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  getEnrollments: async () => {
    const response = await api.get('/users/me/enrollments');
    return response.data;
  },

  getProgress: async () => {
    const response = await api.get('/users/me/progress');
    return response.data;
  },
};

export const paymentService = {
  initiate: async (data: {
    courseId: string;
    amount: number;
    currency?: string;
    paymentMethod: 'orange_money' | 'mtn_momo' | 'card';
  }) => {
    const response = await api.post('/payments/initiate', data);
    return response.data;
  },

  verify: async (reference: string) => {
    const response = await api.get(`/payments/verify/${reference}`);
    return response.data;
  },

  getHistory: async () => {
    const response = await api.get('/payments/history');
    return response.data;
  },
};

export default api;