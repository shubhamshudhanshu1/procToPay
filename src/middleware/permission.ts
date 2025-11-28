import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { permissionCheckService } from '../services/permissionCheckService';

// Re-export AuthenticatedRequest for convenience (routes often import both permission middleware and types)
export type { AuthenticatedRequest };

/**
 * Permission Middleware
 *
 * Reusable middleware to check permissions before route handlers execute.
 * Provides clean, declarative permission checks.
 */

/**
 * Require a specific permission
 *
 * @param permissionSlug Permission slug (e.g., 'tenant:create', 'user:edit')
 * @returns Middleware function
 */
export function requirePermission(permissionSlug: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const tenantId = req.tenantId || req.session?.tenantId || null;

      // Check permission
      const hasPermission = await permissionCheckService.hasPermission(
        userId,
        permissionSlug,
        tenantId
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissionSlug,
        });
        return;
      }

      // Load permissions into request context for use in handlers
      if (!req.permissions) {
        const effectivePermissions = await permissionCheckService.getUserEffectivePermissions(
          userId,
          tenantId
        );
        req.permissions = effectivePermissions.map((p) => p.permission_slug);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require any of the specified permissions
 *
 * @param permissionSlugs Array of permission slugs
 * @returns Middleware function
 */
export function requireAnyPermission(permissionSlugs: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const tenantId = req.tenantId || req.session?.tenantId || null;

      // Check if user has any of the required permissions
      const hasPermission = await permissionCheckService.hasAnyPermission(
        userId,
        permissionSlugs,
        tenantId
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissionSlugs,
        });
        return;
      }

      // Load permissions into request context
      if (!req.permissions) {
        const effectivePermissions = await permissionCheckService.getUserEffectivePermissions(
          userId,
          tenantId
        );
        req.permissions = effectivePermissions.map((p) => p.permission_slug);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require all of the specified permissions
 *
 * @param permissionSlugs Array of permission slugs
 * @returns Middleware function
 */
export function requireAllPermissions(permissionSlugs: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const tenantId = req.tenantId || req.session?.tenantId || null;

      // Check if user has all required permissions
      const hasPermission = await permissionCheckService.hasAllPermissions(
        userId,
        permissionSlugs,
        tenantId
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissionSlugs,
        });
        return;
      }

      // Load permissions into request context
      if (!req.permissions) {
        const effectivePermissions = await permissionCheckService.getUserEffectivePermissions(
          userId,
          tenantId
        );
        req.permissions = effectivePermissions.map((p) => p.permission_slug);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require a specific permission at global scope (for admin routes)
 *
 * Checks permission at global level (tenantId = null) regardless of tenant context.
 * Use this for admin routes that manage system-wide resources.
 *
 * @param permissionSlug Permission slug (e.g., 'role:delete', 'tenant:create')
 * @returns Middleware function
 */
export function requirePermissionGlobal(permissionSlug: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Always check at global scope (null tenantId) for admin routes
      const hasPermission = await permissionCheckService.hasPermission(
        userId,
        permissionSlug,
        null
      );

      if (!hasPermission) {
        res.status(403).json({
          error: 'Insufficient permissions',
          required: permissionSlug,
        });
        return;
      }

      // Load permissions into request context at global scope
      if (!req.permissions) {
        const effectivePermissions = await permissionCheckService.getUserEffectivePermissions(
          userId,
          null
        );
        req.permissions = effectivePermissions.map((p) => p.permission_slug);
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require universal permission (all permissions)
 *
 * Checks if user has universal permission ('*') at global level.
 * This grants access to all system operations (global administration).
 * More flexible than role-based checks - works with any role that has universal permission.
 *
 * @deprecated For new code, use specific permissions with `requirePermissionGlobal()` for better granularity.
 * Only use this when you truly need to check for ALL permissions.
 *
 * @returns Middleware function
 */
export function requireUniversalPermission() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const hasUniversalPermission = await permissionCheckService.hasPermission(userId, '*', null);

      if (!hasUniversalPermission) {
        res.status(403).json({
          error: 'Global administrator access required',
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Universal permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require wildcard permission (all permissions)
 *
 * @deprecated Use `requireUniversalPermission()` instead. This function is kept for backward compatibility.
 *
 * @returns Middleware function
 */
export function requireWildcardPermission() {
  // Delegate to requireUniversalPermission for consistency
  return requireUniversalPermission();
}

/**
 * Require super admin role
 *
 * @deprecated Use `requireUniversalPermission()` instead for better flexibility.
 * This function is kept for backward compatibility.
 *
 * @returns Middleware function
 */
export function requireSuperAdmin() {
  // Delegate to requireUniversalPermission for consistency
  return requireUniversalPermission();
}

/**
 * Require tenant context (tenantId must be set)
 *
 * @returns Middleware function
 */
export function requireTenantContext() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.tenantId || req.session?.tenantId;

    if (!tenantId) {
      res.status(400).json({
        error: 'Tenant context required',
        message: 'Please select a tenant before accessing this resource',
      });
      return;
    }

    next();
  };
}
