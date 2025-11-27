/**
 * Extended Authentication Types
 *
 * Type definitions for authentication with tenant context and permissions.
 */

import { Tenant } from './tenant';
import { Role, Permission, EffectivePermission } from './rbac';

export interface AuthContext {
  userId: string;
  tenantId?: string; // null for global admin context
  permissions: string[]; // Array of permission slugs
  roles: string[]; // Array of role slugs
  policyVer: number; // Policy version for token staleness detection
}

export interface TokenPayload {
  userId: string;
  tenantId?: string;
  policyVer: number;
}

export interface UserWithContext {
  id: string;
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  status: string;
  currentTenant?: Tenant;
  tenants: Tenant[];
  roles: Role[];
  permissions: Permission[];
  effectivePermissions: EffectivePermission[];
  policyVer: number;
}

export interface TenantSelectionOption {
  id: string;
  name: string;
  code?: string;
  status: string;
  userRoles: Array<{
    roleSlug: string;
    roleName: string;
    status: string;
  }>;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  user: UserWithContext;
}

