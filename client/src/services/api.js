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
    const { accessToken, token } = useAuthStore.getState();
    // Prefer accessToken (JWT) over token (session token)
    const authToken = accessToken || token;
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Flag to prevent recursive logout calls
let isLoggingOut = false;

// Response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Skip handling for logout/refresh requests to prevent infinite loops
      const isLogoutRequest = error.config?.url?.includes('/logout');
      const isRefreshRequest = error.config?.url?.includes('/auth/refresh');

      if (isLoggingOut || isLogoutRequest || isRefreshRequest) {
        return Promise.reject(error);
      }

      // Simple: 401 = logout and go to login
      isLoggingOut = true;
      try {
        const logout = useAuthStore.getState().logout;
        await logout();
      } catch (logoutError) {
        // Ignore logout errors
      } finally {
        isLoggingOut = false;
      }

      // Redirect to login if not already there
      const currentPath = window.location.pathname;
      if (!['/login', '/register'].includes(currentPath)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
