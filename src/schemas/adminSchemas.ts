import { z } from 'zod';

/**
 * Admin Validation Schemas
 *
 * Zod schemas for admin endpoint validation.
 */

// Role schemas
// Note: tenantId determines role type (null = global, set = tenant-specific)
export const createRoleSchema = z.object({
  slug: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  tenantId: z.string().uuid().nullable().optional(), // null for global roles, UUID for tenant-specific roles
  description: z.string().max(1000).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

// Permission schemas
export const createPermissionSchema = z.object({
  module: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  slug: z.string().min(1).max(100).optional(), // Auto-generated if not provided
  description: z.string().max(1000).optional(),
});

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional().nullable(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});

// User search schema
export const userSearchSchema = z.object({
  email: z.string().email(),
});

// Role assignment schema
export const assignRoleSchema = z.object({
  roleId: z.string().uuid(),
  status: z.enum(['active', 'pending', 'revoked']).optional(),
});

// User update schema
export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional().nullable(),
  status: z.enum(['active', 'pending', 'locked', 'disabled']).optional(),
});

// Helper: Preprocess empty strings to undefined for optional datetime fields
const optionalDatetime = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return undefined;
    }
    return val;
  },
  z.string().datetime().optional()
);

// Helper: Preprocess empty strings to undefined for optional string fields
const optionalNonEmptyString = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return undefined;
    }
    return val;
  },
  z.string().optional()
);

// Helper: Preprocess empty strings to undefined for optional UUID fields
const optionalUuid = z.preprocess(
  (val) => {
    if (typeof val === 'string' && val.trim() === '') {
      return undefined;
    }
    return val;
  },
  z.string().uuid().optional()
);

// Audit log filter schema
export const auditLogFilterSchema = z.object({
  tenantId: optionalUuid,
  actorUserId: optionalUuid,
  action: optionalNonEmptyString,
  startDate: optionalDatetime,
  endDate: optionalDatetime,
  limit: z.number().int().min(1).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
});
