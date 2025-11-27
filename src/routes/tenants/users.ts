import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../../db/prisma';
import { requireAuth, AuthenticatedRequest } from '../../middleware/auth';
import { requireTenantContext } from '../../middleware/tenantContext';
import { requirePermission } from '../../middleware/permission';
import { userRoleService } from '../../services/userRoleService';
import { roleService } from '../../services/roleService';
import { tenantUserSearchSchema, tenantAssignRoleSchema } from '../../schemas/tenantSchemas';

const router: Router = Router();

/**
 * GET /api/tenants/:tenantId/users
 * List users in tenant
 * Requires: tenant context + user:view permission (or tenant admin)
 */
router.get(
  '/:tenantId/users',
  requireAuth,
  requireTenantContext(),
  requirePermission('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId || req.tenantId;

      // Verify tenantId matches context
      if (req.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant context mismatch' });
      }

      // Get all user roles for this tenant
      const userRoles = await prisma.userRole.findMany({
        where: {
          tenantId,
          status: 'active',
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          },
          role: {
            select: {
              id: true,
              slug: true,
              name: true,
              scope: true,
            },
          },
        },
      });

      // Group by user
      const userMap = new Map();
      userRoles.forEach((ur) => {
        const userId = ur.user.id;
        if (!userMap.has(userId)) {
          userMap.set(userId, {
            ...ur.user,
            roles: [],
          });
        }
        userMap.get(userId).roles.push({
          id: ur.role.id,
          slug: ur.role.slug,
          name: ur.role.name,
          scope: ur.role.scope,
          status: ur.status,
          assignedAt: ur.createdAt,
        });
      });

      const users = Array.from(userMap.values());

      res.json({ success: true, users });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/tenants/:tenantId/users/search?email=...
 * Search users by email (must be registered users)
 * Requires: tenant context + user:view permission
 */
router.get(
  '/:tenantId/users/search',
  requireAuth,
  requireTenantContext(),
  requirePermission('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId || req.tenantId;
      const { email } = tenantUserSearchSchema.parse({ email: req.query.email });

      // Verify tenantId matches context
      if (req.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant context mismatch' });
      }

      // Search for user by email
      const user = await prisma.user.findFirst({
        where: {
          email: { equals: email, mode: 'insensitive' },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          firstName: true,
          lastName: true,
          status: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user already has roles in this tenant
      const existingRoles = await userRoleService.getUserRoles(user.id, tenantId);

      res.json({
        success: true,
        user: {
          ...user,
          existingRoles: existingRoles.map((ur) => ({
            id: ur.role.id,
            slug: ur.role.slug,
            name: ur.role.name,
            status: ur.status,
          })),
        },
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
 * POST /api/tenants/:tenantId/users/:userId/roles
 * Grant role to user in tenant
 * Requires: tenant context + user:edit permission
 */
router.post(
  '/:tenantId/users/:userId/roles',
  requireAuth,
  requireTenantContext(),
  requirePermission('user:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId || req.tenantId;
      const { userId } = req.params;
      const data = tenantAssignRoleSchema.parse(req.body);
      const actorUserId = req.userId || req.session?.userId;

      // Verify tenantId matches context
      if (req.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant context mismatch' });
      }

      // Verify role exists and is tenant-scoped
      const role = await roleService.getRoleById(data.roleId);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      if (role.scope !== 'tenant') {
        return res.status(400).json({
          error: 'Only tenant-scoped roles can be assigned in tenant context',
        });
      }

      // Assign role
      const userRole = await userRoleService.assignRole(
        {
          userId,
          roleId: data.roleId,
          tenantId,
          status: data.status || 'active',
        },
        actorUserId,
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({ success: true, userRole });
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
 * DELETE /api/tenants/:tenantId/users/:userId/roles/:roleId
 * Revoke role from user in tenant
 * Requires: tenant context + user:edit permission
 */
router.delete(
  '/:tenantId/users/:userId/roles/:roleId',
  requireAuth,
  requireTenantContext(),
  requirePermission('user:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId || req.tenantId;
      const { userId, roleId } = req.params;
      const actorUserId = req.userId || req.session?.userId;

      // Verify tenantId matches context
      if (req.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant context mismatch' });
      }

      await userRoleService.revokeRole(
        userId,
        roleId,
        tenantId,
        actorUserId,
        req.ip,
        req.headers['user-agent']
      );

      res.json({ success: true, message: 'Role revoked successfully' });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/tenants/:tenantId/users/:userId/roles
 * Get user roles in tenant
 * Requires: tenant context + user:view permission
 */
router.get(
  '/:tenantId/users/:userId/roles',
  requireAuth,
  requireTenantContext(),
  requirePermission('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId || req.tenantId;
      const { userId } = req.params;

      // Verify tenantId matches context
      if (req.tenantId !== tenantId) {
        return res.status(403).json({ error: 'Tenant context mismatch' });
      }

      const userRoles = await userRoleService.getUserRoles(userId, tenantId);

      res.json({
        success: true,
        roles: userRoles.map((ur) => ({
          id: ur.role.id,
          slug: ur.role.slug,
          name: ur.role.name,
          scope: ur.role.scope,
          status: ur.status,
          assignedAt: ur.createdAt,
        })),
      });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

export default router;

