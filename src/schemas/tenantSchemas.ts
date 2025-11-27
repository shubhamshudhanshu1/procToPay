import { z } from 'zod';

/**
 * Tenant Validation Schemas
 *
 * Zod schemas for tenant-scoped endpoint validation.
 */

// User search schema
export const tenantUserSearchSchema = z.object({
  email: z.string().email(),
});

// Role assignment schema
export const tenantAssignRoleSchema = z.object({
  roleId: z.string().uuid(),
  status: z.enum(['active', 'pending', 'revoked']).optional(),
});

