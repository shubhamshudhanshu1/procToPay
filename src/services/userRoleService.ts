import { prisma } from '../db/prisma';
import { AssignRoleInput, UserRoleStatus } from '../types/rbac';
import { auditService } from './auditService';
import { roleService } from './roleService';
import { policyService } from './policyService';

/**
 * UserRole Service
 *
 * Handles user-role-tenant assignments and queries.
 * Enforces role scope rules (global roles can't have tenantId, tenant roles must have tenantId).
 */

class UserRoleService {
  /**
   * Get all roles for a user
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID to filter by (null for global roles, undefined for all roles)
   * @returns List of user roles
   */
  async getUserRoles(userId: string, tenantId?: string | null) {
    const where: any = {
      userId,
      status: 'active',
    };

    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    return prisma.userRole.findMany({
      where,
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        tenant: true,
      },
    });
  }

  /**
   * Get all tenants a user has access to
   *
   * @param userId User UUID
   * @returns List of tenants with user's roles in each
   */
  async getUserTenants(userId: string) {
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId,
        status: 'active',
        tenantId: { not: null }, // Only tenant-scoped roles
      },
      include: {
        tenant: true,
        role: true,
      },
    });

    // Group by tenant
    const tenantMap = new Map();
    userRoles.forEach((userRole) => {
      if (userRole.tenant) {
        const tenantId = userRole.tenant.id;
        if (!tenantMap.has(tenantId)) {
          tenantMap.set(tenantId, {
            ...userRole.tenant,
            userRoles: [],
          });
        }
        tenantMap.get(tenantId).userRoles.push({
          role: userRole.role,
          status: userRole.status,
        });
      }
    });

    return Array.from(tenantMap.values());
  }

  /**
   * Assign a role to a user
   *
   * @param data Assignment data
   * @param actorUserId User ID making the assignment (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Created user role
   */
  async assignRole(
    data: AssignRoleInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get role to check scope
    const role = await roleService.getRoleById(data.roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    // Validate role scope matches tenantId
    if (role.scope === 'global' && data.tenantId) {
      throw new Error('Global roles cannot be assigned to a tenant');
    }

    if (role.scope === 'tenant' && !data.tenantId) {
      throw new Error('Tenant roles must be assigned to a tenant');
    }

    // Check if assignment already exists
    const existing = await prisma.userRole.findFirst({
      where: {
        userId: data.userId,
        roleId: data.roleId,
        tenantId: data.tenantId || null,
      },
    });

    if (existing) {
      // Update existing assignment if status is different
      if (existing.status !== (data.status || 'active')) {
        const updated = await prisma.userRole.update({
          where: { id: existing.id },
          data: { status: data.status || 'active' },
        });

        // Increment policy version
        await policyService.incrementPolicyVersion();

        // Audit log
        if (actorUserId) {
          await auditService.logRoleAssign(
            data.userId,
            data.roleId,
            data.tenantId || null,
            actorUserId,
            ipAddress,
            userAgent
          );
        }

        return updated;
      }
      return existing;
    }

    // Create new assignment
    const userRole = await prisma.userRole.create({
      data: {
        userId: data.userId,
        roleId: data.roleId,
        tenantId: data.tenantId || null,
        status: data.status || 'active',
      },
      include: {
        role: true,
        tenant: true,
      },
    });

    // Increment policy version
    await policyService.incrementPolicyVersion();

    // Audit log
    if (actorUserId) {
      await auditService.logRoleAssign(
        data.userId,
        data.roleId,
        data.tenantId || null,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    return userRole;
  }

  /**
   * Revoke a role from a user
   *
   * @param userId User UUID
   * @param roleId Role UUID
   * @param tenantId Optional tenant UUID (required for tenant roles)
   * @param actorUserId User ID revoking the role (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Updated user role (status: 'revoked')
   */
  async revokeRole(
    userId: string,
    roleId: string,
    tenantId: string | null,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Find the user role
    const userRole = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId,
        tenantId: tenantId || null,
      },
    });

    if (!userRole) {
      throw new Error('User role assignment not found');
    }

    // Update status to revoked
    const revoked = await prisma.userRole.update({
      where: { id: userRole.id },
      data: { status: 'revoked' },
    });

    // Increment policy version
    await policyService.incrementPolicyVersion();

    // Audit log
    if (actorUserId) {
      await auditService.logRoleRevoke(
        userId,
        roleId,
        tenantId,
        actorUserId,
        ipAddress,
        userAgent
      );
    }

    return revoked;
  }

  /**
   * Check if user has a specific role
   *
   * @param userId User UUID
   * @param roleSlug Role slug (e.g., 'super_admin', 'tenant_admin')
   * @param tenantId Optional tenant UUID (required for tenant roles)
   * @returns true if user has the role
   */
  async checkUserHasRole(userId: string, roleSlug: string, tenantId?: string): Promise<boolean> {
    // Get role by slug
    const role = await roleService.getRoleBySlug(roleSlug);
    if (!role) {
      return false;
    }

    // Build where clause
    const where: any = {
      userId,
      roleId: role.id,
      status: 'active',
    };

    // For global roles, tenantId must be null
    // For tenant roles, tenantId must match
    if (role.scope === 'global') {
      where.tenantId = null;
    } else {
      if (!tenantId) {
        return false; // Tenant role requires tenantId
      }
      where.tenantId = tenantId;
    }

    const userRole = await prisma.userRole.findFirst({ where });
    return !!userRole;
  }

  /**
   * Check if user is super admin
   *
   * @deprecated Use hasGlobalRole() or permission checks instead for better flexibility
   * @param userId User UUID
   * @returns true if user has super_admin role (global scope)
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    return this.checkUserHasRole(userId, 'super_admin');
  }

  /**
   * Check if user has a global role
   *
   * @param userId User UUID
   * @param roleSlug Role slug (e.g., 'super_admin', 'system_admin')
   * @returns true if user has the role (global scope)
   */
  async hasGlobalRole(userId: string, roleSlug: string): Promise<boolean> {
    return this.checkUserHasRole(userId, roleSlug, null);
  }

  /**
   * Check if user has any of the specified global roles
   *
   * @param userId User UUID
   * @param roleSlugs Array of role slugs to check
   * @returns true if user has any of the roles (global scope)
   */
  async hasAnyGlobalRole(userId: string, roleSlugs: string[]): Promise<boolean> {
    for (const roleSlug of roleSlugs) {
      if (await this.hasGlobalRole(userId, roleSlug)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if user has a tenant-scoped role
   *
   * @param userId User UUID
   * @param roleSlug Role slug (e.g., 'tenant_admin')
   * @param tenantId Tenant UUID
   * @returns true if user has the role in the tenant
   */
  async hasTenantRole(userId: string, roleSlug: string, tenantId: string): Promise<boolean> {
    return this.checkUserHasRole(userId, roleSlug, tenantId);
  }
}

export const userRoleService = new UserRoleService();

