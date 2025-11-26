import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL + '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for session-based authentication
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent recursive logout calls
let isLoggingOut = false;

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Skip logout handling if:
      // 1. Already logging out (prevent infinite loop)
      // 2. This is a logout request itself (don't logout on logout)
      // 3. Already on auth pages
      const isLogoutRequest = error.config?.url?.includes('/logout');
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/register', '/verify-otp'].includes(currentPath);

      if (isLoggingOut || isLogoutRequest || isAuthPage) {
        return Promise.reject(error);
      }

      // Token expired or invalid, logout user
      isLoggingOut = true;
      try {
        const logout = useAuthStore.getState().logout;
        await logout();
      } catch (logoutError) {
        // Ignore logout errors to prevent infinite loop
        console.error('Logout error in interceptor:', logoutError);
      } finally {
        isLoggingOut = false;
      }

      // Only redirect if not already on login or verify-otp pages
      if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
