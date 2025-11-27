import { prisma } from '../db/prisma';

/**
 * Audit Service
 *
 * Handles audit logging for all system actions.
 * Provides centralized audit trail for compliance and security.
 */

export interface AuditLogInput {
  actorUserId?: string;
  tenantId?: string;
  action: string; // e.g., 'tenant.create', 'user.invite', 'role.assign'
  resource?: string; // e.g., 'tenant:123', 'user:456'
  beforeJson?: any;
  afterJson?: any;
  ip?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  tenantId?: string;
  actorUserId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class AuditService {
  /**
   * Log an action to the audit trail
   *
   * @param data Audit log data
   * @returns Created audit log entry
   */
  async logAction(data: AuditLogInput) {
    try {
      return await prisma.auditLog.create({
        data: {
          actorUserId: data.actorUserId || null,
          tenantId: data.tenantId || null,
          action: data.action,
          resource: data.resource || null,
          beforeJson: data.beforeJson || null,
          afterJson: data.afterJson || null,
          ip: data.ip || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log audit action:', error);
      return null;
    }
  }

  /**
   * Get audit logs with filters
   *
   * @param filters Filter criteria
   * @returns List of audit logs
   */
  async getAuditLogs(filters: AuditLogFilters = {}) {
    const where: any = {};

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.actorUserId) {
      where.actorUserId = filters.actorUserId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      where.ts = {};
      if (filters.startDate) {
        where.ts.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.ts.lte = filters.endDate;
      }
    }

    return prisma.auditLog.findMany({
      where,
      orderBy: { ts: 'desc' },
      take: filters.limit || 100,
      skip: filters.offset || 0,
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get audit logs for a specific tenant
   *
   * @param tenantId Tenant UUID
   * @param filters Additional filter criteria
   * @returns List of audit logs for the tenant
   */
  async getTenantAuditLogs(tenantId: string, filters: Omit<AuditLogFilters, 'tenantId'> = {}) {
    return this.getAuditLogs({
      ...filters,
      tenantId,
    });
  }

  /**
   * Helper: Log tenant creation
   */
  async logTenantCreate(
    tenantId: string,
    tenantData: any,
    actorUserId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.logAction({
      ...(actorUserId && { actorUserId }),
      tenantId,
      action: 'tenant.create',
      resource: `tenant:${tenantId}`,
      afterJson: tenantData,
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
    });
  }

  /**
   * Helper: Log tenant update
   */
  async logTenantUpdate(
    tenantId: string,
    beforeData: any,
    afterData: any,
    actorUserId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.logAction({
      ...(actorUserId && { actorUserId }),
      tenantId,
      action: 'tenant.update',
      resource: `tenant:${tenantId}`,
      beforeJson: beforeData,
      afterJson: afterData,
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
    });
  }

  /**
   * Helper: Log role assignment
   */
  async logRoleAssign(
    userId: string,
    roleId: string,
    tenantId: string | null,
    actorUserId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.logAction({
      ...(actorUserId && { actorUserId }),
      ...(tenantId && { tenantId }),
      action: 'role.assign',
      resource: `user:${userId}`,
      afterJson: { userId, roleId, tenantId },
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
    });
  }

  /**
   * Helper: Log role revocation
   */
  async logRoleRevoke(
    userId: string,
    roleId: string,
    tenantId: string | null,
    actorUserId?: string,
    ip?: string,
    userAgent?: string
  ) {
    return this.logAction({
      ...(actorUserId && { actorUserId }),
      ...(tenantId && { tenantId }),
      action: 'role.revoke',
      resource: `user:${userId}`,
      afterJson: { userId, roleId, tenantId },
      ...(ip && { ip }),
      ...(userAgent && { userAgent }),
    });
  }
}

export const auditService = new AuditService();
