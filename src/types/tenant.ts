/**
 * Tenant Types
 *
 * Type definitions for tenant-related operations.
 */

export type TenantStatus = 'active' | 'suspended' | 'deleted';

export interface Tenant {
  id: string;
  name: string;
  code?: string;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantInput {
  name: string;
  code?: string;
  status?: TenantStatus;
}

export interface UpdateTenantInput {
  name?: string;
  code?: string;
  status?: TenantStatus;
}

export interface TenantWithRoles extends Tenant {
  userRoles?: Array<{
    role: {
      id: string;
      slug: string;
      name: string;
      tenantId: string | null; // null for global roles, UUID for tenant-specific roles
    };
    status: string;
  }>;
}
