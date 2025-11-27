import { useAuthStore } from '../store/authStore';

/**
 * Hook for checking user permissions
 * @returns {Object} Permission checking functions
 */
export const usePermissions = () => {
  const { permissions, isSuperAdmin } = useAuthStore();

  /**
   * Check if user has a specific permission
   * @param {string} permissionSlug - Permission slug (e.g., 'tenant:create', 'user:edit')
   * @returns {boolean}
   */
  const hasPermission = (permissionSlug) => {
    if (isSuperAdmin) {
      return true; // Super admin has all permissions
    }
    return permissions.includes(permissionSlug);
  };

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissionSlugs - Array of permission slugs
   * @returns {boolean}
   */
  const hasAnyPermission = (permissionSlugs) => {
    if (isSuperAdmin) {
      return true;
    }
    return permissionSlugs.some((slug) => permissions.includes(slug));
  };

  /**
   * Check if user has all of the specified permissions
   * @param {string[]} permissionSlugs - Array of permission slugs
   * @returns {boolean}
   */
  const hasAllPermissions = (permissionSlugs) => {
    if (isSuperAdmin) {
      return true;
    }
    return permissionSlugs.every((slug) => permissions.includes(slug));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isSuperAdmin,
    permissions,
  };
};

