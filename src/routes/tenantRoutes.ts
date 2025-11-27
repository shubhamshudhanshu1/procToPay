import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { userRoleService } from '../services/userRoleService';
import { permissionCheckService } from '../services/permissionCheckService';
import { tenantService } from '../services/tenantService';
import { tokenService } from '../services/tokenService';
import { policyService } from '../services/policyService';
import { auditService } from '../services/auditService';

const router: Router = Router();

/**
 * Schema for tenant selection
 */
const selectTenantSchema = z.object({
  tenantId: z.string().uuid().nullable(), // null for global admin (requires tenant:view permission at global level)
});

/**
 * GET /api/auth/tenants
 * Get list of tenants user has access to
 * Users with tenant:view permission at global level see all tenants
 */
router.get(
  '/tenants',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if user has permission to view all tenants (global admin access)
      // This allows super_admin and any future global roles with tenant:view permission
      const canViewAllTenants = await permissionCheckService.hasPermission(
        userId,
        'tenant:view',
        null
      );

      let tenants: any[] = [];

      if (canViewAllTenants) {
        // Users with tenant:view permission at global level see all tenants
        const allTenants = await tenantService.getAllTenants({ status: 'active' });
        tenants = allTenants.map((tenant) => ({
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: tenant.status,
          userRoles: [], // Global admins don't need explicit roles per tenant
        }));
      } else {
        // Regular user sees only tenants they have access to
        const userTenants = await userRoleService.getUserTenants(userId);
        tenants = userTenants.map((tenant: any) => ({
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: tenant.status,
          userRoles: tenant.userRoles.map((ur: any) => ({
            roleSlug: ur.role.slug,
            roleName: ur.role.name,
            status: ur.status,
          })),
        }));
      }

      res.json({
        success: true,
        tenants,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return next(error);
      }
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/auth/session/select-tenant
 * Select tenant context and generate full access/refresh tokens
 * Only users with tenant:view permission at global level can select null (global admin)
 */
router.post(
  '/session/select-tenant',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { tenantId } = selectTenantSchema.parse(req.body);

      // Check if user has permission to access global administration
      // This allows super_admin and any future global roles with tenant:view permission
      const canAccessGlobalAdmin = await permissionCheckService.hasPermission(
        userId,
        'tenant:view',
        null
      );

      // Validate tenant selection
      if (tenantId === null && !canAccessGlobalAdmin) {
        return res.status(403).json({
          error: 'Only users with global administration access can access global administration',
        });
      }

      if (tenantId !== null) {
        // Verify tenant exists and user has access
        const tenant = await tenantService.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }

        if (tenant.status !== 'active') {
          return res.status(403).json({ error: 'Tenant is not active' });
        }

        // For users without global admin access, verify they have access to this tenant
        if (!canAccessGlobalAdmin) {
          const userTenants = await userRoleService.getUserTenants(userId);
          const hasAccess = userTenants.some((t: any) => t.id === tenantId);
          if (!hasAccess) {
            return res.status(403).json({ error: 'You do not have access to this tenant' });
          }
        }
      }

      // Get policy version
      const policyVer = await policyService.getPolicyVersion();

      // Generate access token with tenant context
      const tokenPayload: { userId: string; tenantId?: string; policyVer: number } = {
        userId,
        policyVer,
      };
      if (tenantId) {
        tokenPayload.tenantId = tenantId;
      }
      const accessToken = tokenService.generateAccessToken(tokenPayload);

      // Generate refresh token and store in database
      const refreshToken = await tokenService.generateRefreshToken(
        tokenPayload,
        req.headers['user-agent'],
        req.ip
      );

      // Update session for backward compatibility
      if (req.session) {
        (req.session as any).userId = userId;
        (req.session as any).tenantId = tenantId;
      }

      // Audit log
      const auditLogData: {
        actorUserId: string;
        tenantId?: string;
        action: string;
        resource: string;
        afterJson: { tenantId: string | null };
        ip?: string;
        userAgent?: string;
      } = {
        actorUserId: userId,
        action: 'tenant.select',
        resource: tenantId ? `tenant:${tenantId}` : 'global',
        afterJson: { tenantId },
      };
      if (tenantId) {
        auditLogData.tenantId = tenantId;
      }
      if (req.ip) {
        auditLogData.ip = req.ip;
      }
      if (req.headers['user-agent']) {
        auditLogData.userAgent = req.headers['user-agent'];
      }
      await auditService.logAction(auditLogData);

      res.json({
        success: true,
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes
        tenantId: tenantId || null,
      });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return next(error);
      }
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

export default router;
