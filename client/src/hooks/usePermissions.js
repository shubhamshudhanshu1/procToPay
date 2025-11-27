import { useAuthStore } from '../store/authStore';

/**
 * Hook for checking user permissions and roles
 * @returns {Object} Permission and role checking functions
 */
export const usePermissions = () => {
  const { permissions, roles } = useAuthStore();

  /**
   * Check if user has wildcard permission (all permissions)
   * @returns {boolean}
   */
  const hasWildcardPermission = () => {
    return permissions.includes('*');
  };

  /**
   * Check if user has a specific permission
   * @param {string} permissionSlug - Permission slug (e.g., 'tenant:create', 'user:edit')
   * @returns {boolean}
   */
  const hasPermission = (permissionSlug) => {
    // User with wildcard permission has all permissions
    if (hasWildcardPermission()) {
      return true;
    }
    return permissions.includes(permissionSlug);
  };

  /**
   * Check if user has any of the specified permissions
   * @param {string[]} permissionSlugs - Array of permission slugs
   * @returns {boolean}
   */
  const hasAnyPermission = (permissionSlugs) => {
    // User with wildcard permission has all permissions
    if (hasWildcardPermission()) {
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
    // User with wildcard permission has all permissions
    if (hasWildcardPermission()) {
      return true;
    }
    return permissionSlugs.every((slug) => permissions.includes(slug));
  };

  /**
   * Check if user has a global role (for role-based checks when needed)
   * @param {string} roleSlug - Role slug (e.g., 'super_admin', 'system_admin')
   * @returns {boolean}
   */
  const hasGlobalRole = (roleSlug) => {
    if (!roles || roles.length === 0) return false;
    return roles.some((role) => role.slug === roleSlug && (role.tenantId === null || role.tenantId === undefined));
  };

  /**
   * Check if user has any of the specified global roles
   * @param {string[]} roleSlugs - Array of role slugs
   * @returns {boolean}
   */
  const hasAnyGlobalRole = (roleSlugs) => {
    return roleSlugs.some((slug) => hasGlobalRole(slug));
  };

  /**
   * Check if user has a tenant role (for role-based checks when needed)
   * @param {string} roleSlug - Role slug (e.g., 'tenant_admin')
   * @returns {boolean}
   */
  const hasTenantRole = (roleSlug) => {
    if (!roles || roles.length === 0) return false;
    return roles.some((role) => role.slug === roleSlug && role.tenantId !== null && role.tenantId !== undefined);
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasGlobalRole,
    hasAnyGlobalRole,
    hasTenantRole,
    hasWildcardPermission,
    permissions,
    roles,
  };
};
