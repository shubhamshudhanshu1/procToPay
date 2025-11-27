import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { userRoleService } from '../services/userRoleService';
import { tenantService } from '../services/tenantService';
import { tokenService } from '../services/tokenService';
import { policyService } from '../services/policyService';
import { auditService } from '../services/auditService';

const router: Router = Router();

/**
 * Schema for tenant selection
 */
const selectTenantSchema = z.object({
  tenantId: z.string().uuid().nullable(), // null for global admin (super_admin only)
});

/**
 * GET /api/auth/tenants
 * Get list of tenants user has access to
 * Super admins see all tenants + global admin option
 */
router.get('/tenants', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId || req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is super admin
    const isSuperAdmin = await userRoleService.isSuperAdmin(userId);

    let tenants: any[] = [];

    if (isSuperAdmin) {
      // Super admin sees all tenants
      const allTenants = await tenantService.getAllTenants({ status: 'active' });
      tenants = allTenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        status: tenant.status,
        userRoles: [], // Super admin doesn't need explicit roles per tenant
      }));

      // Add global admin option for super admin
      tenants.unshift({
        id: null,
        name: 'Global Administration',
        code: 'global',
        status: 'active',
        userRoles: [{ roleSlug: 'super_admin', roleName: 'Super Admin', status: 'active' }],
      });
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
      isSuperAdmin,
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
});

/**
 * POST /api/auth/session/select-tenant
 * Select tenant context and generate full access/refresh tokens
 * Only super_admin can select null (global admin)
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

      // Check if user is super admin
      const isSuperAdmin = await userRoleService.isSuperAdmin(userId);

      // Validate tenant selection
      if (tenantId === null && !isSuperAdmin) {
        return res.status(403).json({
          error: 'Only super administrators can access global administration',
        });
      }

      if (tenantId !== null) {
        // Verify tenant exists and user has access (unless super admin)
        const tenant = await tenantService.getTenantById(tenantId);
        if (!tenant) {
          return res.status(404).json({ error: 'Tenant not found' });
        }

        if (tenant.status !== 'active') {
          return res.status(403).json({ error: 'Tenant is not active' });
        }

        // For non-super-admin users, verify they have access to this tenant
        if (!isSuperAdmin) {
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
      const accessToken = tokenService.generateAccessToken({
        userId,
        tenantId: tenantId || undefined,
        policyVer,
      });

      // Generate refresh token and store in database
      const refreshToken = await tokenService.generateRefreshToken(
        {
          userId,
          tenantId: tenantId || undefined,
          policyVer,
        },
        req.headers['user-agent'],
        req.ip
      );

      // Update session for backward compatibility
      if (req.session) {
        (req.session as any).userId = userId;
        (req.session as any).tenantId = tenantId;
      }

      // Audit log
      await auditService.logAction({
        actorUserId: userId,
        tenantId: tenantId || undefined,
        action: 'tenant.select',
        resource: tenantId ? `tenant:${tenantId}` : 'global',
        afterJson: { tenantId },
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });

      res.json({
        success: true,
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes
        tenantId: tenantId || null,
        isSuperAdmin,
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

