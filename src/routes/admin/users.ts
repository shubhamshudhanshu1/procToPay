import { Router, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { prisma } from '../../db/prisma';
import { requirePermissionGlobal, AuthenticatedRequest } from '../../middleware/permission';
import { userRoleService } from '../../services/userRoleService';
import { roleService } from '../../services/roleService';
import { userSearchSchema, assignRoleSchema, updateUserSchema } from '../../schemas/adminSchemas';

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
            userRoles: {
              where: {
                status: 'active',
              },
              select: {
                id: true,
                role: {
                  select: {
                    id: true,
                    slug: true,
                    name: true,
                    tenantId: true,
                  },
                },
                tenant: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      // Transform users to include formatted roles
      const usersWithRoles = users.map((user) => ({
        ...user,
        roles: user.userRoles.map((ur) => ({
          id: ur.role.id,
          slug: ur.role.slug,
          name: ur.role.name,
          tenantId: ur.role.tenantId,
          tenantName: ur.tenant?.name || null,
          isGlobal: ur.role.tenantId === null,
        })),
      }));

      res.json({
        success: true,
        users: usersWithRoles.map(({ userRoles, ...user }) => user), // Remove userRoles from response
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
 * POST /api/admin/users/:userId/roles
 * Grant global role to user (global admin operation)
 */
router.post(
  '/:userId/roles',
  requirePermissionGlobal('user:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const data = assignRoleSchema.parse(req.body);
      const actorUserId = req.userId || req.session?.userId;

      // Verify role exists and is global-scoped
      const role = await roleService.getRoleById(data.roleId);
      if (!role) {
        return res.status(404).json({ error: 'Role not found' });
      }

      // Check if role is global (tenantId == null)
      if (role.tenantId !== null) {
        return res
          .status(400)
          .json({
            error:
              'Only global roles can be assigned via admin route. Use tenant route for tenant-scoped roles.',
          });
      }

      // Assign global role (tenantId = undefined for global roles)
      const userRole = await userRoleService.assignRole(
        {
          userId,
          roleId: data.roleId,
          // tenantId omitted = undefined = global role
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
 * DELETE /api/admin/users/:userId/roles/:roleId
 * Revoke global role from user
 */
router.delete(
  '/:userId/roles/:roleId',
  requirePermissionGlobal('user:revoke'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId, roleId } = req.params;
      if (!userId || !roleId) {
        return res.status(400).json({ error: 'User ID and Role ID are required' });
      }

      const actorUserId = req.userId || req.session?.userId;

      await userRoleService.revokeRole(
        userId,
        roleId,
        null, // Global role (tenantId = null)
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
 * GET /api/admin/users/:userId/roles
 * Get user's global roles
 */
router.get(
  '/:userId/roles',
  requirePermissionGlobal('user:view'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Get global roles (tenantId = null)
      const userRoles = await userRoleService.getUserRoles(userId, null);

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

/**
 * PATCH /api/admin/users/:userId
 * Update user details (status, firstName, lastName, email, phoneNumber)
 */
router.patch(
  '/:userId',
  requirePermissionGlobal('user:edit'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const data = updateUserSchema.parse(req.body);
      const actorUserId = req.userId || req.session?.userId;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if email is already taken by another user (if email is being updated)
      if (data.email && data.email !== existingUser.email) {
        const emailUser = await prisma.user.findUnique({
          where: { email: data.email },
        });

        if (emailUser && emailUser.id !== userId) {
          return res.status(400).json({ error: 'Email is already in use by another user' });
        }
      }

      // Check if phone number is already taken by another user (if phone is being updated)
      if (data.phoneNumber !== undefined) {
        if (data.phoneNumber && data.phoneNumber !== existingUser.phoneNumber) {
          const phoneUser = await prisma.user.findUnique({
            where: { phoneNumber: data.phoneNumber },
          });

          if (phoneUser && phoneUser.id !== userId) {
            return res.status(400).json({ error: 'Phone number is already in use by another user' });
          }
        }
      }

      // Increment tokenVersion if status is being changed (to invalidate existing tokens)
      const updateData: any = { ...data };
      if (data.status && data.status !== existingUser.status) {
        updateData.tokenVersion = { increment: 1 };
      }

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
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
      });

      // Audit log
      if (actorUserId) {
        const { auditService } = await import('../../services/auditService');
        await auditService.logAction({
          actorUserId,
          action: 'user.update',
          resource: `user:${userId}`,
          details: {
            updatedFields: Object.keys(data),
            oldValues: {
              firstName: existingUser.firstName,
              lastName: existingUser.lastName,
              email: existingUser.email,
              phoneNumber: existingUser.phoneNumber,
              status: existingUser.status,
            },
            newValues: data,
          },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      res.json({
        success: true,
        user: updatedUser,
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
