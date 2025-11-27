import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { tenantService } from '../services/tenantService';
import { permissionCheckService } from '../services/permissionCheckService';

/**
 * Tenant Context Middleware
 *
 * Validates and loads tenant context into request.
 * Ensures user has access to the tenant.
 */

/**
 * Require tenant context (tenantId must be set and valid)
 *
 * @returns Middleware function
 */
export function requireTenantContext() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const tenantId = req.tenantId || req.session?.tenantId;

      if (!tenantId) {
        res.status(400).json({
          error: 'Tenant context required',
          message: 'Please select a tenant before accessing this resource',
        });
        return;
      }

      // Verify tenant exists
      const tenant = await tenantService.getTenantById(tenantId);
      if (!tenant) {
        res.status(404).json({ error: 'Tenant not found' });
        return;
      }

      // Check if tenant is active
      if (tenant.status !== 'active') {
        res.status(403).json({ error: 'Tenant is not active' });
        return;
      }

      // Check if user has permission to view all tenants (global admin access)
      // Users with tenant:view permission at global level have access to all tenants
      const canViewAllTenants = await permissionCheckService.hasPermission(userId, 'tenant:view', null);

      // For users without global admin access, verify they have access to this tenant
      if (!canViewAllTenants) {
        const userTenants = await userRoleService.getUserTenants(userId);
        const hasAccess = userTenants.some((t: any) => t.id === tenantId);

        if (!hasAccess) {
          res.status(403).json({ error: 'You do not have access to this tenant' });
          return;
        }
      }

      // Add tenant to request context
      (req as any).tenant = tenant;
      req.tenantId = tenantId;

      next();
    } catch (error) {
      console.error('Tenant context validation error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Optional tenant context (loads tenant if tenantId is set, but doesn't require it)
 *
 * @returns Middleware function
 */
export function optionalTenantContext() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.tenantId || req.session?.tenantId;

      if (tenantId) {
        // Verify tenant exists and is active
        const tenant = await tenantService.getTenantById(tenantId);
        if (tenant && tenant.status === 'active') {
          (req as any).tenant = tenant;
          req.tenantId = tenantId;
        }
      }

      next();
    } catch (error) {
      // Don't fail if tenant context is optional
      console.warn('Optional tenant context error:', error);
      next();
    }
  };
}

