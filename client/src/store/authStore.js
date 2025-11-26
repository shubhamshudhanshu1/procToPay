import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (userData, token) => {
        set({
          user: userData,
          token,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        // Clear local state first to prevent recursive calls
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });

        // Call logout API to destroy session on server
        // Do this after clearing state so if it fails with 401, interceptor won't call logout again
        try {
          await authService.logout();
        } catch (error) {
          // Continue with logout even if API call fails (session might already be invalid)
          // Don't log 401 errors as they're expected when session is already expired
          if (error.response?.status !== 401) {
            console.error('Logout API error:', error);
          }
        }
      },

      updateUser: (userData) => {
        set({ user: userData });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
