import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { userRoleService } from './userRoleService';
import { EffectivePermission } from '../types/rbac';

/**
 * Permission Check Service
 *
 * Centralized permission checking with Redis caching for performance.
 * Queries v_user_effective_perms view and handles super_admin special case.
 * Cache is invalidated when policy version changes.
 */

class PermissionCheckService {
  private readonly cachePrefix = 'perms:';
  private readonly cacheTTL = 300; // 5 minutes

  /**
   * Get user's effective permissions
   *
   * Queries v_user_effective_perms view or returns cached result.
   * Super admins automatically have all permissions.
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
    // Check if user is super admin
    const isSuperAdmin = await userRoleService.isSuperAdmin(userId);

    // Super admin has all permissions (we'll return a special marker)
    if (isSuperAdmin) {
      // Return a marker that indicates all permissions
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
   * @param permissionSlug Permission slug (e.g., 'tenant:create', 'user:edit')
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has the permission
   */
  async hasPermission(
    userId: string,
    permissionSlug: string,
    tenantId?: string | null
  ): Promise<boolean> {
    // Super admin has all permissions
    const isSuperAdmin = await userRoleService.isSuperAdmin(userId);
    if (isSuperAdmin) {
      return true;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);

    // Check if permission exists in the list
    return permissions.some((p) => p.permission_slug === permissionSlug);
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
    // Super admin has all permissions
    const isSuperAdmin = await userRoleService.isSuperAdmin(userId);
    if (isSuperAdmin) {
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
    // Super admin has all permissions
    const isSuperAdmin = await userRoleService.isSuperAdmin(userId);
    if (isSuperAdmin) {
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
    await redis.del(cacheKey);
  }

  /**
   * Invalidate permission cache for all users
   * Called when policy version changes (roles/permissions updated)
   */
  async invalidateAllCache() {
    const keys = await redis.keys(`${this.cachePrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const permissionCheckService = new PermissionCheckService();

