import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTenantContext } from './useTenantContext';
import { tenantService } from '../services/tenantService';
import { authService } from '../services/authService';

/**
 * Custom hook to handle tenant context selection
 * Works for both regular tenant selection and global admin context (tenantId: null)
 * Reusable across components that need to switch tenant context
 */
export const useTenantSelection = () => {
  const navigate = useNavigate();
  const { selectTenant } = useAuthStore();
  const { isInGlobalContext, tenantId: currentTenantId } = useTenantContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Select tenant context (or global admin if tenantId is null) and optionally navigate
   *
   * @param {Object} options - Configuration options
   * @param {string|null} options.tenantId - Tenant ID to select (null for global admin context)
   * @param {Object|null} options.tenant - Tenant object (optional, will be set to null if tenantId is null)
   * @param {string} options.navigateTo - Route to navigate to after selecting context
   * @param {boolean} options.skipIfAlreadySelected - If true, skip selection if already in requested context
   * @param {Function} options.onSuccess - Callback on success
   * @param {Function} options.onError - Callback on error
   * @returns {Promise} Promise that resolves when context is selected
   */
  const selectTenantContext = async ({
    tenantId,
    tenant = null,
    navigateTo = null,
    skipIfAlreadySelected = true,
    onSuccess = null,
    onError = null,
  }) => {
    // Skip if already in the requested context
    if (skipIfAlreadySelected) {
      const isGlobalAdmin = tenantId === null;
      if (isGlobalAdmin && isInGlobalContext) {
        if (navigateTo) {
          navigate(navigateTo);
        }
        if (onSuccess) {
          onSuccess();
        }
        return;
      }
      if (!isGlobalAdmin && currentTenantId === tenantId) {
        if (navigateTo) {
          navigate(navigateTo);
        }
        if (onSuccess) {
          onSuccess();
        }
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Select tenant context (tenantId can be null for global admin)
      const response = await tenantService.selectTenant(tenantId);

      // Update auth store with tenant context
      selectTenant(
        {
          tenantId: response.tenantId || null,
          tenant: tenant || null,
        },
        response.accessToken,
        response.refreshToken
      );

      // Fetch full user context
      const userData = await authService.getCurrentUser();
      useAuthStore.getState().updateUserContext(userData);

      // Navigate if route provided
      if (navigateTo) {
        navigate(navigateTo);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(userData);
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        (tenantId === null ? 'Failed to select global admin context' : 'Failed to select tenant');
      setError(errorMessage);
      console.error(
        tenantId === null ? 'Failed to select global admin context:' : 'Failed to select tenant:',
        err
      );

      // Call error callback first (it might handle navigation)
      if (onError) {
        onError(err, errorMessage);
      } else if (navigateTo) {
        // If no error callback provided, still try to navigate as fallback
        console.warn('Navigation fallback: attempting to navigate despite error');
        navigate(navigateTo);
      }

      // Re-throw so caller can handle if needed
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convenience method to select global admin context (tenantId: null)
   * This is an alias for selectTenantContext({ tenantId: null, ... })
   */
  const selectGlobalAdminContext = async (options = {}) => {
    // Map skipIfAlreadyGlobal to skipIfAlreadySelected for backward compatibility
    const { skipIfAlreadyGlobal, ...restOptions } = options;

    // Ensure skipIfAlreadySelected defaults to true if skipIfAlreadyGlobal is undefined
    const skipIfAlreadySelected =
      skipIfAlreadyGlobal !== undefined
        ? skipIfAlreadyGlobal
        : restOptions.skipIfAlreadySelected !== undefined
          ? restOptions.skipIfAlreadySelected
          : true;

    return selectTenantContext({
      tenantId: null,
      tenant: null,
      skipIfAlreadySelected,
      ...restOptions,
    });
  };

  return {
    selectTenantContext,
    selectGlobalAdminContext, // Backward compatibility
    loading,
    error,
    isInGlobalContext,
    currentTenantId,
  };
};

// Export with both names for backward compatibility
export const useGlobalAdminContext = useTenantSelection;
