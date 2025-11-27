import { prisma } from '../db/prisma';
import { auditService } from './auditService';

/**
 * Tenant Service
 *
 * Handles all tenant-related operations including CRUD, validation, and audit logging.
 * Provides centralized business logic for tenant management.
 */

export interface CreateTenantInput {
  name: string;
  code?: string;
  status?: 'active' | 'suspended' | 'deleted';
}

export interface UpdateTenantInput {
  name?: string;
  code?: string;
  status?: 'active' | 'suspended' | 'deleted';
}

class TenantService {
  /**
   * Get tenant by ID
   *
   * @param id Tenant UUID
   * @returns Tenant or null if not found
   */
  async getTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }

  /**
   * Get all tenants
   *
   * @param filters Optional filters (status, etc.)
   * @returns List of tenants
   */
  async getAllTenants(filters?: { status?: string }) {
    const where = filters?.status ? { status: filters.status } : {};
    return prisma.tenant.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new tenant
   *
   * @param data Tenant creation data
   * @param actorUserId User ID creating the tenant (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Created tenant
   */
  async createTenant(
    data: CreateTenantInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Validate tenant name
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Tenant name is required');
    }

    // Validate tenant code if provided
    if (data.code && data.code.trim().length === 0) {
      throw new Error('Tenant code cannot be empty if provided');
    }

    // Check if tenant name already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { name: data.name.trim() },
    });

    if (existingTenant) {
      throw new Error(`Tenant with name "${data.name}" already exists`);
    }

    // Check if tenant code already exists (if provided)
    if (data.code) {
      const existingCode = await prisma.tenant.findUnique({
        where: { code: data.code.trim() },
      });

      if (existingCode) {
        throw new Error(`Tenant with code "${data.code}" already exists`);
      }
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: data.name.trim(),
        code: data.code?.trim() || null,
        status: data.status || 'active',
      },
    });

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        action: 'tenant.create',
        resource: `tenant:${tenant.id}`,
        afterJson: tenant,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }

    return tenant;
  }

  /**
   * Update tenant
   *
   * @param id Tenant UUID
   * @param data Update data
   * @param actorUserId User ID updating the tenant (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Updated tenant
   */
  async updateTenant(
    id: string,
    data: UpdateTenantInput,
    actorUserId?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get existing tenant for audit
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      throw new Error('Tenant not found');
    }

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Tenant name cannot be empty');
      }

      // Check if new name conflicts with existing tenant
      const nameConflict = await prisma.tenant.findFirst({
        where: {
          name: data.name.trim(),
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw new Error(`Tenant with name "${data.name}" already exists`);
      }
    }

    // Validate code if provided
    if (data.code !== undefined) {
      if (data.code && data.code.trim().length === 0) {
        throw new Error('Tenant code cannot be empty if provided');
      }

      // Check if new code conflicts with existing tenant
      if (data.code) {
        const codeConflict = await prisma.tenant.findFirst({
          where: {
            code: data.code.trim(),
            id: { not: id },
          },
        });

        if (codeConflict) {
          throw new Error(`Tenant with code "${data.code}" already exists`);
        }
      }
    }

    // Build update data
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.code !== undefined) updateData.code = data.code?.trim() || null;
    if (data.status !== undefined) updateData.status = data.status;

    // Update tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    if (actorUserId) {
      await auditService.logAction({
        actorUserId,
        tenantId: id,
        action: 'tenant.update',
        resource: `tenant:${id}`,
        beforeJson: existingTenant,
        afterJson: updatedTenant,
        ...(ipAddress && { ip: ipAddress }),
        ...(userAgent && { userAgent }),
      });
    }

    return updatedTenant;
  }

  /**
   * Suspend a tenant
   *
   * @param id Tenant UUID
   * @param actorUserId User ID suspending the tenant (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Updated tenant
   */
  async suspendTenant(id: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    return this.updateTenant(id, { status: 'suspended' }, actorUserId, ipAddress, userAgent);
  }

  /**
   * Activate a tenant
   *
   * @param id Tenant UUID
   * @param actorUserId User ID activating the tenant (for audit)
   * @param ipAddress IP address (for audit)
   * @param userAgent User agent (for audit)
   * @returns Updated tenant
   */
  async activateTenant(id: string, actorUserId?: string, ipAddress?: string, userAgent?: string) {
    return this.updateTenant(id, { status: 'active' }, actorUserId, ipAddress, userAgent);
  }
}

export const tenantService = new TenantService();
