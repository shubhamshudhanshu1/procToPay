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

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      // Skip logout handling if:
      // 1. Already logging out (prevent infinite loop)
      // 2. This is a logout request itself (don't logout on logout)
      // 3. Already on auth pages
      // 4. This is a refresh token request (to prevent infinite refresh loop)
      const isLogoutRequest = error.config?.url?.includes('/logout');
      const isRefreshRequest = error.config?.url?.includes('/auth/refresh');
      const currentPath = window.location.pathname;
      const isAuthPage = ['/login', '/register', '/verify-otp', '/tenant-selection'].includes(currentPath);

      if (isLoggingOut || isLogoutRequest || isRefreshRequest || isAuthPage) {
        return Promise.reject(error);
      }

      // Try to refresh token if we have a refresh token
      const { refreshToken, requiresTenantSelection } = useAuthStore.getState();
      
      if (refreshToken && !requiresTenantSelection && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          const { authService } = await import('./authService');
          const response = await authService.refreshToken(refreshToken);
          
          // Update access token in store
          useAuthStore.getState().accessToken = response.accessToken;
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          console.error('Token refresh failed:', refreshError);
        }
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

      // Redirect based on context
      if (requiresTenantSelection) {
        window.location.href = '/tenant-selection';
      } else if (!isAuthPage) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
