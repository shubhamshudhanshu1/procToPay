import { useAuthStore } from '../store/authStore';
import { usePermissions } from './usePermissions';

/**
 * Hook for accessing tenant context
 * @returns {Object} Tenant context and helper methods
 */
export const useTenantContext = () => {
  const { tenantId, currentTenant, selectTenant, clearTenant } = useAuthStore();
  const { isSuperAdmin } = usePermissions();

  /**
   * Check if user is in tenant context
   * @returns {boolean}
   */
  const isInTenantContext = () => {
    return tenantId !== null;
  };

  /**
   * Check if user is in global admin context
   * @returns {boolean}
   */
  const isInGlobalContext = () => {
    return tenantId === null && isSuperAdmin;
  };

  /**
   * Get current tenant name or "Global Administration"
   * @returns {string}
   */
  const getContextName = () => {
    if (isInGlobalContext()) {
      return 'Global Administration';
    }
    return currentTenant?.name || 'No Tenant Selected';
  };

  return {
    tenantId,
    currentTenant,
    selectTenant,
    clearTenant,
    isInTenantContext: isInTenantContext(),
    isInGlobalContext: isInGlobalContext(),
    getContextName,
    isSuperAdmin,
  };
};

