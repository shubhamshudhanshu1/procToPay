/**
 * RBAC (Role-Based Access Control) Types
 *
 * Type definitions for roles, permissions, and access control.
 */

export type UserRoleStatus = 'active' | 'pending' | 'revoked';

export interface Role {
  id: string;
  slug: string;
  name: string;
  tenantId?: string | null; // null for global roles, tenant UUID for tenant-specific roles
  description?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  module: string; // e.g., 'tenant', 'user', 'role'
  action: string; // e.g., 'create', 'view', 'edit', 'delete'
  slug: string; // e.g., 'tenant:create'
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  roleId: string;
  permissionId: string;
  role: Role;
  permission: Permission;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  tenantId?: string; // null for global roles
  status: UserRoleStatus;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  role: Role;
  tenant?: any;
}

export interface EffectivePermission {
  user_id: string;
  tenant_id: string | null;
  role_slug: string;
  module: string;
  action: string;
  permission_slug: string;
}

export interface CreateRoleInput {
  slug: string;
  name: string;
  tenantId?: string | null; // null for global roles, tenant UUID for tenant-specific roles
  description?: string;
  createdBy?: string;
  permissionIds?: string[]; // Permissions to assign to this role
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[]; // Permissions to assign/update
}

export interface CreatePermissionInput {
  module: string;
  action: string;
  slug: string;
  description?: string;
}

export interface AssignRoleInput {
  userId: string;
  roleId: string;
  tenantId?: string; // null for global roles
  status?: UserRoleStatus;
}
