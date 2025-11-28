import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../../db/prisma';
import { requirePermissionGlobal, AuthenticatedRequest } from '../../middleware/permission';
import { userRoleService } from '../../services/userRoleService';
import { roleService } from '../../services/roleService';
import { userSearchSchema, assignRoleSchema } from '../../schemas/adminSchemas';

const router: Router = Router();

/**
 * GET /api/admin/users
 * List all registered users (with optional filters)
 */
router.get(
  '/',
  requirePermissionGlobal('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const email = req.query.email as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      const where: any = {};
      if (email) {
        where.email = { contains: email, mode: 'insensitive' };
      }
      if (status) {
        where.status = status;
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            phoneNumber: true,
            firstName: true,
            lastName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        success: true,
        users,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    } catch (error: any) {
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 500;
      next(err);
    }
  }
);

/**
 * GET /api/admin/users/search?email=...
 * Search users by email
 */
router.get(
  '/search',
  requirePermissionGlobal('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { email } = userSearchSchema.parse({ email: req.query.email });

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

      res.json({ success: true, user });
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
 * GET /api/admin/users/tenants/:tenantId
 * List users in a tenant
 */
router.get(
  '/tenants/:tenantId',
  requirePermissionGlobal('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.params.tenantId;

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
              tenantId: true,
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
          tenantId: ur.role.tenantId,
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
 * POST /api/admin/users/tenants/:tenantId/:userId/roles
 * Grant role to user in tenant
 */
router.post(
  '/tenants/:tenantId/:userId/roles',
  requirePermissionGlobal('user:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req.params;
      const data = assignRoleSchema.parse(req.body);
      const actorUserId = req.userId || req.session?.userId;

      // Verify role exists and is tenant-scoped
      const role = await roleService.getRoleById(data.roleId);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if role is tenant-scoped (tenantId != null)
      if (role.tenantId === null) {
        return res
          .status(400)
          .json({ error: 'Only tenant-scoped roles can be assigned to tenants' });
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
 * DELETE /api/admin/users/tenants/:tenantId/:userId/roles/:roleId
 * Revoke role from user in tenant
 */
router.delete(
  '/tenants/:tenantId/:userId/roles/:roleId',
  requirePermissionGlobal('user:revoke'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId, roleId } = req.params;
      const actorUserId = req.userId || req.session?.userId;

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
 * GET /api/admin/users/tenants/:tenantId/:userId/roles
 * Get user roles in tenant
 */
router.get(
  '/tenants/:tenantId/:userId/roles',
  requirePermissionGlobal('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { tenantId, userId } = req.params;

      const userRoles = await userRoleService.getUserRoles(userId, tenantId);

      res.json({
        success: true,
        roles: userRoles.map((ur) => ({
          id: ur.role.id,
          slug: ur.role.slug,
          name: ur.role.name,
          tenantId: ur.role.tenantId,
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
