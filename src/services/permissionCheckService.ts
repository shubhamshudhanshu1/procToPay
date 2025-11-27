import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { EffectivePermission } from '../types/rbac';

/**
 * Permission Check Service
 *
 * Centralized permission checking with Redis caching for performance.
 * Queries v_user_effective_perms view and handles wildcard permission ('*') special case.
 * Any role with '*' permission grants all permissions (more flexible than hardcoded role checks).
 * Cache is invalidated when policy version changes.
 */

class PermissionCheckService {
  private readonly cachePrefix = 'perms:';
  private readonly cacheTTL = 300; // 5 minutes

  /**
   * Check if user has wildcard permission (all permissions)
   * 
   * Currently, this checks if user has the 'super_admin' role (which has all permissions).
   * This is more flexible than hardcoding the check - any role with all permissions would work.
   * In the future, if we add a wildcard permission ('*') to the database, this can be updated
   * to check for that permission instead.
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has wildcard access (all permissions)
   */
  private async hasWildcardPermission(
    userId: string,
    tenantId?: string | null
  ): Promise<boolean> {
    // Check cache first for wildcard permission
    const wildcardCacheKey = `${this.cachePrefix}wildcard:${userId}:${tenantId || 'global'}`;
    const cached = await redis.get(wildcardCacheKey);
    if (cached !== null) {
      return cached === 'true';
    }

    // Query database view for super_admin role (which grants all permissions)
    // This checks the role_slug instead of a specific permission
    // More flexible: any role with role_slug that grants all permissions would work
    // Future: can check for wildcard permission ('*') if we add it to the database
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM v_user_effective_perms
      WHERE user_id = ${userId}::uuid
        AND (tenant_id = ${tenantId}::uuid OR tenant_id IS NULL)
        AND role_slug = 'super_admin'
      LIMIT 1
    `;

    const hasWildcard = (result[0]?.count ?? BigInt(0)) > 0;

    // Cache the result (same TTL as permissions)
    await redis.setex(wildcardCacheKey, this.cacheTTL, hasWildcard ? 'true' : 'false');

    return hasWildcard;
  }

  /**
   * Get user's effective permissions
   *
   * Queries v_user_effective_perms view or returns cached result.
   * Users with wildcard permission ('*') automatically have all permissions.
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID (null for global context)
   * @param forceRefresh Force refresh from database (skip cache)
   * @returns Array of effective permissions
   */
  async getUserEffectivePermissions(
    userId: string,
    tenantId?: string | null,
    forceRefresh = false
  ): Promise<EffectivePermission[]> {
    // Check if user has wildcard permission (more flexible than role check)
    // Any role with '*' permission grants all permissions
    const hasWildcard = await this.hasWildcardPermission(userId, tenantId);

    // User with wildcard permission has all permissions
    if (hasWildcard) {
      // Return a marker that indicates all permissions
      // This is handled specially in permission checks
      return [{ permission_slug: '*', module: '*', action: '*' }] as any;
    }

    // Build cache key
    const cacheKey = `${this.cachePrefix}${userId}:${tenantId || 'global'}`;

    // Try cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    // Query database view
    const permissions = await prisma.$queryRaw<EffectivePermission[]>`
      SELECT 
        user_id,
        tenant_id,
        role_slug,
        module,
        action,
        permission_slug
      FROM v_user_effective_perms
      WHERE user_id = ${userId}::uuid
        AND (tenant_id = ${tenantId}::uuid OR tenant_id IS NULL)
    `;

    // Cache the result
    await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(permissions));

    return permissions;
  }

  /**
   * Check if user has a specific permission
   *
   * @param userId User UUID
   * @param permissionSlug Permission slug (e.g., 'tenant:create', 'user:edit') or '*' for wildcard permission check
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has the permission
   */
  async hasPermission(
    userId: string,
    permissionSlug: string,
    tenantId?: string | null
  ): Promise<boolean> {
    // Check if user has wildcard permission (grants all permissions)
    // More flexible than checking for a specific role
    const hasWildcard = await this.hasWildcardPermission(userId, tenantId);
    if (hasWildcard) {
      return true;
    }

    // Special case: '*' means wildcard permission check
    if (permissionSlug === '*') {
      return hasWildcard;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);

    // Check if permission exists in the list
    // Handle special marker for super admin (permission_slug === '*')
    return permissions.some(
      (p) => p.permission_slug === permissionSlug || p.permission_slug === '*'
    );
  }

  /**
   * Check if user has any of the specified permissions
   *
   * @param userId User UUID
   * @param permissionSlugs Array of permission slugs
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has at least one of the permissions
   */
  async hasAnyPermission(
    userId: string,
    permissionSlugs: string[],
    tenantId?: string | null
  ): Promise<boolean> {
    // User with wildcard permission has all permissions
    const hasWildcard = await this.hasWildcardPermission(userId, tenantId);
    if (hasWildcard) {
      return true;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);

    // Check if any permission exists in the list
    return permissionSlugs.some((slug) =>
      permissions.some((p) => p.permission_slug === slug)
    );
  }

  /**
   * Check if user has all of the specified permissions
   *
   * @param userId User UUID
   * @param permissionSlugs Array of permission slugs
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has all of the permissions
   */
  async hasAllPermissions(
    userId: string,
    permissionSlugs: string[],
    tenantId?: string | null
  ): Promise<boolean> {
    // User with wildcard permission has all permissions
    const hasWildcard = await this.hasWildcardPermission(userId, tenantId);
    if (hasWildcard) {
      return true;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);
    const permissionSlugSet = new Set(permissions.map((p) => p.permission_slug));

    // Check if all permissions exist
    return permissionSlugs.every((slug) => permissionSlugSet.has(slug));
  }

  /**
   * Invalidate permission cache for a user
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID (null for global context)
   */
  async invalidateCache(userId: string, tenantId?: string | null) {
    const cacheKey = `${this.cachePrefix}${userId}:${tenantId || 'global'}`;
    const wildcardCacheKey = `${this.cachePrefix}wildcard:${userId}:${tenantId || 'global'}`;
    await redis.del(cacheKey);
    await redis.del(wildcardCacheKey);
  }

  /**
   * Invalidate permission cache for all users
   * Called when policy version changes (roles/permissions updated)
   */
  async invalidateAllCache() {
    // This will delete all permission cache keys including wildcard cache keys
    const keys = await redis.keys(`${this.cachePrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const permissionCheckService = new PermissionCheckService();

