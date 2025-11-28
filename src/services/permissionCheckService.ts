import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { EffectivePermission } from '../types/rbac';

/**
 * Permission Check Service
 *
 * Centralized permission checking with Redis caching for performance.
 * Queries v_user_effective_perms view and handles universal permission ('*') special case.
 * Any role with '*' permission grants all permissions (more flexible than hardcoded role checks).
 * Cache is invalidated when policy version changes.
 */

class PermissionCheckService {
  private readonly cachePrefix = 'perms:';
  private readonly cacheTTL = 300; // 5 minutes

  /**
   * Check if user has universal permission ('*') that grants all permissions
   *
   * Checks the database for '*' permission assigned to any of the user's active roles.
   * This is permission-based rather than role-based, making it more flexible.
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has universal permission (all permissions)
   */
  private async hasUniversalPermission(userId: string, tenantId?: string | null): Promise<boolean> {
    // Check cache first for universal permission
    const universalCacheKey = `${this.cachePrefix}universal:${userId}:${tenantId || 'global'}`;
    try {
      const cached = await redis.get(universalCacheKey);
      if (cached !== null) {
        return cached === 'true';
      }
    } catch (error) {
      // Redis failure - continue to database check
      console.warn(
        'Redis cache read failed for universal permission, falling back to database:',
        error
      );
    }

    // Query database view for '*' permission (universal permission that grants all permissions)
    // This checks for the permission directly, not a specific role
    // Any role with '*' permission grants full access
    const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS(
        SELECT 1
        FROM v_user_effective_perms
        WHERE user_id = ${userId}::uuid
          AND (tenant_id = ${tenantId}::uuid OR tenant_id IS NULL)
          AND permission_slug = '*'
        LIMIT 1
      ) as exists
    `;

    const hasUniversal = result[0]?.exists ?? false;

    // Cache the result (same TTL as permissions)
    try {
      await redis.setex(universalCacheKey, this.cacheTTL, hasUniversal ? 'true' : 'false');
    } catch (error) {
      // Redis failure - non-critical, log and continue
      console.warn('Redis cache write failed for universal permission:', error);
    }

    return hasUniversal;
  }

  /**
   * Get user's effective permissions
   *
   * Queries v_user_effective_perms view or returns cached result.
   * Users with universal permission ('*') automatically have all permissions.
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
    // Check if user has universal permission ('*') which grants all permissions
    // Any role with '*' permission grants full access
    const hasUniversal = await this.hasUniversalPermission(userId, tenantId);

    // User with universal permission has all permissions
    if (hasUniversal) {
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
   * @param permissionSlug Permission slug (e.g., 'tenant:create', 'user:edit') or '*' for universal permission check
   * @param tenantId Optional tenant UUID (null for global context)
   * @returns true if user has the permission
   */
  async hasPermission(
    userId: string,
    permissionSlug: string,
    tenantId?: string | null
  ): Promise<boolean> {
    // Check if user has universal permission ('*') which grants all permissions
    const hasUniversal = await this.hasUniversalPermission(userId, tenantId);
    if (hasUniversal) {
      return true;
    }

    // Special case: '*' means universal permission check
    if (permissionSlug === '*') {
      return hasUniversal;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);

    // Check if permission exists in the list
    // Handle special marker for universal permission (permission_slug === '*')
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
    // User with universal permission ('*') has all permissions
    const hasUniversal = await this.hasUniversalPermission(userId, tenantId);
    if (hasUniversal) {
      return true;
    }

    // Get user's effective permissions
    const permissions = await this.getUserEffectivePermissions(userId, tenantId);

    // Check if any permission exists in the list
    return permissionSlugs.some((slug) => permissions.some((p) => p.permission_slug === slug));
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
    // User with universal permission ('*') has all permissions
    const hasUniversal = await this.hasUniversalPermission(userId, tenantId);
    if (hasUniversal) {
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
    const universalCacheKey = `${this.cachePrefix}universal:${userId}:${tenantId || 'global'}`;
    await redis.del(cacheKey);
    await redis.del(universalCacheKey);
  }

  /**
   * Invalidate permission cache for all users
   * Called when policy version changes (roles/permissions updated)
   */
  async invalidateAllCache() {
    // This will delete all permission cache keys including universal permission cache keys
    const keys = await redis.keys(`${this.cachePrefix}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

export const permissionCheckService = new PermissionCheckService();
