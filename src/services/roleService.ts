import { prisma } from '../db/prisma';
import { CreateRoleInput, UpdateRoleInput } from '../types/rbac';
import { auditService } from './auditService';
import { policyService } from './policyService';

/**
 * Role Service
 *
 * Handles all role-related operations including CRUD, permission assignment, and validation.
 * Roles are either global (tenantId=null) or tenant-specific (tenantId set).
 */

class RoleService {
  /**
   * Get all roles
   *
   * @param tenantId Optional filter by tenant (null for global roles, UUID for tenant roles, undefined for all)
   * @returns List of roles
   */
  async getAllRoles(tenantId?: string | null) {
    const where: any = {};

    // Filter by tenantId
    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    return prisma.role.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Get role by ID
   *
   * @param id Role UUID
   * @returns Role with permissions or null
   */
  async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role;
  }

  /**
   * Get role by slug
   *
   * @param slug Role slug (e.g., 'super_admin', 'tenant_admin')
   * @param tenantId Optional tenant ID (null for global roles, UUID for tenant-specific roles)
   * @returns Role with permissions or null
   */
  async getRoleBySlug(slug: string, tenantId?: string | null) {
    // For composite unique key with nullable tenantId, use findFirst instead of findUnique
    // Prisma's findUnique doesn't handle nullable fields in composite keys well
    const roleTenantId = tenantId === undefined ? null : tenantId;
    const role = await prisma.role.findFirst({
      where: {
        slug,
        tenantId: roleTenantId,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role;
  }

  /**
   * Get permissions for a role
   *
   * @param roleId Role UUID
   * @returns List of permissions assigned to the role
   */
  async getRolePermissions(roleId: string) {
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }

    return role.rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Create a new role
   *
   * @param data Role creation data
   * @param actorUserId User ID creating the role (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Created role with permissions
   */
  async createRole(
    data: CreateRoleInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate slug
    if (!data.slug || data.slug.trim().length === 0) {
      throw new Error('Role slug is required');
    }

    // Validate name
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Role name is required');
    }

    // tenantId=null for global roles, tenantId=UUID for tenant-specific roles
    const tenantId = data.tenantId ?? null;
    // tenantId = null → global role
    // tenantId != null → tenant role

    // Check if slug already exists for this tenant (or globally if tenantId is null)
    const existingRole = await this.getRoleBySlug(data.slug.trim(), tenantId);
    if (existingRole) {
      const context = tenantId ? `for tenant ${tenantId}` : 'globally';
      throw new Error(`Role with slug "${data.slug}" already exists ${context}`);
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        slug: data.slug.trim(),
        name: data.name.trim(),
        tenantId,
        description: data.description?.trim() || null,
        createdBy: actorUserId || null,
      },
    });

    // Assign permissions if provided
    if (data.permissionIds && data.permissionIds.length > 0) {
      await this.assignPermissionsToRole(role.id, data.permissionIds);
    }

    // Increment policy version (role changes affect permissions)
    await policyService.incrementPolicyVersion();

    // Get full role with permissions
    const roleWithPermissions = await this.getRoleById(role.id);

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        action: 'role.create',
        resource: `role:${role.id}`,
        afterJson: roleWithPermissions,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }

    return roleWithPermissions;
  }

  /**
   * Update a role
   *
   * @param id Role UUID
   * @param data Update data
   * @param actorUserId User ID updating the role (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Updated role with permissions
   */
  async updateRole(
    id: string,
    data: UpdateRoleInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get existing role for audit
    const existingRole = await this.getRoleById(id);
    if (!existingRole) {
      throw new Error('Role not found');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Role name cannot be empty');
      }
    }

    // Build update data (slug and tenantId cannot be changed)
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;

    // Update role
    await prisma.role.update({
      where: { id },
      data: updateData,
    });

    // Update permissions if provided
    if (data.permissionIds !== undefined) {
      // Remove all existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: id },
      });

      // Assign new permissions
      if (data.permissionIds.length > 0) {
        await this.assignPermissionsToRole(id, data.permissionIds);
      }

      // Increment policy version (permission changes affect access)
      await policyService.incrementPolicyVersion();
    }

    // Get full role with permissions
    const roleWithPermissions = await this.getRoleById(id);

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        action: 'role.update',
        resource: `role:${id}`,
        beforeJson: existingRole,
        afterJson: roleWithPermissions,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }

    return roleWithPermissions;
  }

  /**
   * Assign permissions to a role
   *
   * @param roleId Role UUID
   * @param permissionIds Array of permission UUIDs
   */
  private async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // Verify all permissions exist
    const permissions = await prisma.permission.findMany({
      where: { id: { in: permissionIds } },
    });

    if (permissions.length !== permissionIds.length) {
      throw new Error('One or more permissions not found');
    }

    // Create role-permission relationships
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Delete a role (soft delete by marking as inactive or hard delete)
   *
   * @param id Role UUID
   * @param actorUserId User ID deleting the role (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   */
  async deleteRole(id: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    // Check if role is in use
    const userRoles = await prisma.userRole.findFirst({
      where: { roleId: id },
    });

    if (userRoles) {
      throw new Error('Cannot delete role that is assigned to users');
    }

    // Get role for audit
    const role = await this.getRoleById(id);
    if (!role) {
      throw new Error('Role not found');
    }

    // Delete role (cascade will delete role_permissions)
    await prisma.role.delete({
      where: { id },
    });

    // Increment policy version
    await policyService.incrementPolicyVersion();

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        action: 'role.delete',
        resource: `role:${id}`,
        beforeJson: role,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }
  }
}

export const roleService = new RoleService();
