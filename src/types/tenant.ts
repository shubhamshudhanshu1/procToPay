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
      slug: string;
      name: string;
      scope: 'global' | 'tenant';
    };
    status: string;
  }>;
}

