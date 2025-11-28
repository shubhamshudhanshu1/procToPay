import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requirePermissionGlobal, AuthenticatedRequest } from '../../middleware/permission';
import { tenantService } from '../../services/tenantService';
import { createTenantSchema, updateTenantSchema } from '../../schemas/adminSchemas';

const router: Router = Router();

/**
 * GET /api/admin/tenants
 * List all tenants
 */
router.get(
  '/',
  requirePermissionGlobal('tenant:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const tenants = await tenantService.getAllTenants(status ? { status } : undefined);
      res.json({ success: true, tenants });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/admin/tenants/:id
 * Get tenant details
 */
router.get(
  '/:id',
  requirePermissionGlobal('tenant:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenant = await tenantService.getTenantById(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }
      res.json({ success: true, tenant });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/admin/tenants
 * Create a new tenant
 */
router.post(
  '/',
  requirePermissionGlobal('tenant:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createTenantSchema.parse(req.body);
      const userId = req.userId || req.session?.userId;

      const tenant = await tenantService.createTenant(
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, tenant });
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
 * PATCH /api/admin/tenants/:id
 * Update a tenant
 */
router.patch(
  '/:id',
  requirePermissionGlobal('tenant:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateTenantSchema.parse(req.body);
      const userId = req.userId || req.session?.userId;

      const tenant = await tenantService.updateTenant(
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, tenant });
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
 * POST /api/admin/tenants/:id/suspend
 * Suspend a tenant
 */
router.post(
  '/:id/suspend',
  requirePermissionGlobal('tenant:suspend'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;

      const tenant = await tenantService.suspendTenant(
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, tenant });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/admin/tenants/:id/activate
 * Activate a tenant
 */
router.post(
  '/:id/activate',
  requirePermissionGlobal('tenant:suspend'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;

      const tenant = await tenantService.activateTenant(
        req.params.id,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, tenant });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

export default router;
