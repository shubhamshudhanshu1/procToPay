import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authService } from "../services/authService";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      accessToken: null, // JWT access token
      refreshToken: null, // JWT refresh token
      isAuthenticated: false,
      tenantId: null, // Current tenant context
      currentTenant: null, // Current tenant details
      permissions: [], // User's effective permissions
      roles: [], // User's roles
      policyVer: null, // Policy version for token staleness
      requiresTenantSelection: false, // Whether user needs to select tenant

      login: (userData, sessionToken) => {
        set({
          user: userData,
          token: sessionToken, // Short-lived session token
          isAuthenticated: true,
          requiresTenantSelection: true, // After OTP verify, tenant selection is needed
        });
      },

      selectTenant: (tenantData, accessToken, refreshToken) => {
        set({
          tenantId: tenantData.tenantId,
          currentTenant: tenantData.tenant,
          accessToken,
          refreshToken,
          requiresTenantSelection: false,
        });
      },

      updateUserContext: (userData) => {
        set({
          user: userData,
          tenantId: userData.currentTenant?.id || null,
          currentTenant: userData.currentTenant,
          permissions: userData.permissions || [],
          roles: userData.roles || [],
          policyVer: userData.policyVer || null,
        });
      },

      clearTenant: () => {
        set({
          tenantId: null,
          currentTenant: null,
          requiresTenantSelection: true,
        });
      },

      restoreSession: (userData) => {
        set({
          user: userData,
          isAuthenticated: true,
          tenantId: userData?.currentTenant?.id || null,
          currentTenant: userData?.currentTenant || null,
          permissions: userData?.permissions || [],
          roles: userData?.roles || [],
          policyVer: userData?.policyVer || null,
          requiresTenantSelection: !userData?.currentTenant,
        });
      },

      logout: async () => {
        // Clear local state first to prevent recursive calls
        set({
          user: null,
          token: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          tenantId: null,
          currentTenant: null,
          permissions: [],
          roles: [],
          policyVer: null,
          requiresTenantSelection: false,
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
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        tenantId: state.tenantId,
        currentTenant: state.currentTenant,
        permissions: state.permissions,
        roles: state.roles,
        policyVer: state.policyVer,
        requiresTenantSelection: state.requiresTenantSelection,
      }),
    }
  )
);
