import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { requirePermissionGlobal, AuthenticatedRequest } from '../../middleware/permission';
import { permissionService } from '../../services/permissionService';
import { createPermissionSchema } from '../../schemas/adminSchemas';

const router: Router = Router();

/**
 * GET /api/admin/permissions
 * List all permissions
 */
router.get(
  '/',
  requirePermissionGlobal('permission:view'),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionService.getAllPermissions();
      res.json({ success: true, permissions });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/admin/permissions/:id
 * Get permission details
 */
router.get(
  '/:id',
  requirePermissionGlobal('permission:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Get by slug (since we use slug as identifier)
      const permission = await permissionService.getPermissionBySlug(req.params.id);
      if (!permission) {
        return res.status(404).json({ error: 'Permission not found' });
      }
      res.json({ success: true, permission });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/admin/permissions
 * Create a new permission
 */
router.post(
  '/',
  requirePermissionGlobal('permission:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createPermissionSchema.parse(req.body);
      const userId = req.userId || req.session?.userId;

      const permission = await permissionService.createPermission(
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, permission });
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
 * GET /api/admin/permissions/module/:module
 * Get permissions by module
 */
router.get(
  '/module/:module',
  requirePermissionGlobal('permission:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = await permissionService.getPermissionsByModule(req.params.module);
      res.json({ success: true, permissions });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

export default router;
