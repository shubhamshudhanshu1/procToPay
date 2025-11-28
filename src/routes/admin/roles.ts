import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { z } from 'zod';
import { requirePermissionGlobal, AuthenticatedRequest } from '../../middleware/permission';
import { roleService } from '../../services/roleService';
import { createRoleSchema, updateRoleSchema } from '../../schemas/adminSchemas';

const router: Router = Router();

/**
 * GET /api/admin/roles
 * List all roles
 */
router.get(
  '/',
  requirePermissionGlobal('role:view'),
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const roles = await roleService.getAllRoles();
      res.json({ success: true, roles });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/admin/roles/:id
 * Get role details
 */
router.get(
  '/:id',
  requirePermissionGlobal('role:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.getRoleById(req.params.id);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }
      res.json({ success: true, role });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/admin/roles
 * Create a new role
 */
router.post(
  '/',
  requirePermissionGlobal('role:create'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = createRoleSchema.parse(req.body);
      const userId = req.userId || req.session?.userId;

      const role = await roleService.createRole(data, userId, req.ip, req.headers['user-agent']);

      res.status(201).json({ success: true, role });
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
 * PATCH /api/admin/roles/:id
 * Update a role
 */
router.patch(
  '/:id',
  requirePermissionGlobal('role:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const data = updateRoleSchema.parse(req.body);
      const userId = req.userId || req.session?.userId;

      const role = await roleService.updateRole(
        req.params.id,
        data,
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, role });
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
 * DELETE /api/admin/roles/:id
 * Delete a role
 */
router.delete(
  '/:id',
  requirePermissionGlobal('role:delete'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;

      await roleService.deleteRole(req.params.id, userId, req.ip, req.headers['user-agent']);

      res.json({ success: true, message: 'Role deleted successfully' });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/admin/roles/:roleId/permissions
 * Get permissions for a role
 */
router.get(
  '/:roleId/permissions',
  requirePermissionGlobal('role:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const permissions = await roleService.getRolePermissions(req.params.roleId);
      res.json({ success: true, permissions });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * POST /api/admin/roles/:roleId/permissions
 * Assign permissions to a role
 */
router.post(
  '/:roleId/permissions',
  requirePermissionGlobal('role:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { permissionIds } = z
        .object({
          permissionIds: z.array(z.string().uuid()),
        })
        .parse(req.body);

      const userId = req.userId || req.session?.userId;

      // Update role with new permissions
      const role = await roleService.updateRole(
        req.params.roleId,
        { permissionIds },
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, role });
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
 * DELETE /api/admin/roles/:roleId/permissions/:permissionId
 * Remove permission from role
 */
router.delete(
  '/:roleId/permissions/:permissionId',
  requirePermissionGlobal('role:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const role = await roleService.getRoleById(req.params.roleId);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Get current permissions and remove the specified one
      const currentPermissions = role.rolePermissions.map((rp) => rp.permissionId);
      const updatedPermissionIds = currentPermissions.filter(
        (id) => id !== req.params.permissionId
      );

      const userId = req.userId || req.session?.userId;

      // Update role with remaining permissions
      await roleService.updateRole(
        req.params.roleId,
        { permissionIds: updatedPermissionIds },
        userId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Permission removed from role' });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

export default router;
