import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { permissionCheckService } from '../services/permissionCheckService';

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
        req.isSuperAdmin = effectivePermissions.some((p) => p.permission_slug === '*');
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
        req.isSuperAdmin = effectivePermissions.some((p) => p.permission_slug === '*');
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
        req.isSuperAdmin = effectivePermissions.some((p) => p.permission_slug === '*');
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Require super admin role
 *
 * @returns Middleware function
 */
export function requireSuperAdmin() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const isSuperAdmin = await permissionCheckService.hasPermission(userId, '*', null);

      if (!isSuperAdmin) {
        res.status(403).json({
          error: 'Super administrator access required',
        });
        return;
      }

      req.isSuperAdmin = true;
      next();
    } catch (error) {
      console.error('Super admin check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
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
