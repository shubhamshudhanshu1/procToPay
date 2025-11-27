import { prisma } from '../db/prisma';
import { CreatePermissionInput } from '../types/rbac';
import { auditService } from './auditService';
import { policyService } from './policyService';

/**
 * Permission Service
 *
 * Handles permission management including CRUD operations and validation.
 * Permissions follow module:action format (e.g., 'tenant:create', 'user:edit').
 */

class PermissionService {
  /**
   * Get all permissions
   *
   * @returns List of all permissions
   */
  async getAllPermissions() {
    return prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
  }

  /**
   * Get permission by slug
   *
   * @param slug Permission slug (e.g., 'tenant:create')
   * @returns Permission or null
   */
  async getPermissionBySlug(slug: string) {
    return prisma.permission.findUnique({
      where: { slug },
    });
  }

  /**
   * Get permissions by module
   *
   * @param module Module name (e.g., 'tenant', 'user', 'role')
   * @returns List of permissions for the module
   */
  async getPermissionsByModule(module: string) {
    return prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    });
  }

  /**
   * Get permissions by action
   *
   * @param action Action name (e.g., 'create', 'view', 'edit', 'delete')
   * @returns List of permissions with the action
   */
  async getPermissionsByAction(action: string) {
    return prisma.permission.findMany({
      where: { action },
      orderBy: { module: 'asc' },
    });
  }

  /**
   * Create a new permission
   *
   * @param data Permission creation data
   * @param actorUserId User ID creating the permission (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Created permission
   */
  async createPermission(
    data: CreatePermissionInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate module
    if (!data.module || data.module.trim().length === 0) {
      throw new Error('Permission module is required');
    }

    // Validate action
    if (!data.action || data.action.trim().length === 0) {
      throw new Error('Permission action is required');
    }

    // Validate slug format (should be module:action)
    const expectedSlug = `${data.module.trim()}:${data.action.trim()}`;
    if (data.slug && data.slug !== expectedSlug) {
      throw new Error(`Permission slug should be "${expectedSlug}" but got "${data.slug}"`);
    }

    // Use provided slug or generate from module:action
    const slug = data.slug?.trim() || expectedSlug;

    // Check if slug already exists
    const existingPermission = await this.getPermissionBySlug(slug);
    if (existingPermission) {
      throw new Error(`Permission with slug "${slug}" already exists`);
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        module: data.module.trim(),
        action: data.action.trim(),
        slug,
        description: data.description?.trim() || null,
      },
    });

    // Increment policy version (permission changes affect access)
    await policyService.incrementPolicyVersion();

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        action: 'permission.create',
        resource: `permission:${permission.id}`,
        afterJson: permission,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }

    return permission;
  }

  /**
   * Validate module:action format
   *
   * @param slug Permission slug to validate
   * @returns true if valid format
   */
  validatePermissionFormat(slug: string): boolean {
    const parts = slug.split(':');
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  }
}

export const permissionService = new PermissionService();

