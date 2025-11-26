# Multi-Tenant RBAC Implementation Plan

## Overview

This document outlines the complete implementation plan for adding multi-tenant RBAC (Role-Based Access Control) to the existing ProcToPay application. The implementation is broken down into 10 major milestones with detailed tasks.

### **Why Multi-Tenant RBAC?**

- **Business Need**: Support multiple organizations (tenants) using the same application instance
- **Security**: Isolate data and operations between tenants
- **Scalability**: Single codebase serves multiple clients
- **Flexibility**: Different roles and permissions per tenant
- **Compliance**: Audit trails and access control for regulatory requirements

### **Key Benefits**

- ✅ **Data Isolation**: Each tenant's data is completely separated
- ✅ **Role-Based Access**: Fine-grained permission control
- ✅ **Super Admin Control**: Centralized management of all tenants
- ✅ **Audit Trail**: Complete logging of all actions
- ✅ **Scalable Architecture**: Easy to add new tenants and features

---

## **MILESTONE 1: Database Schema Foundation**

**Goal**: Extend Prisma schema with multi-tenant models and maintain backward compatibility

### **Why This Milestone?**

The database schema is the foundation of the entire system. Without proper data models, no other functionality can work. This milestone ensures:

- **Data Integrity**: Proper relationships and constraints at the database level
- **Type Safety**: Prisma generates TypeScript types from schema
- **Backward Compatibility**: Existing User model and OTP system continue to work
- **Future-Proof**: Schema designed to scale with business needs

### **What Problem It Solves**

- **Problem**: Current system has single-user model, no tenant concept
- **Solution**: Introduce Tenant model and relationships
- **Problem**: No role or permission system exists
- **Solution**: Create RBAC models (Role, Permission, RolePermission)
- **Problem**: Users can't belong to multiple organizations
- **Solution**: UserRole junction table with tenantId

### **Benefits**

- ✅ **Single Source of Truth**: Schema defines all data structures
- ✅ **Type Safety**: TypeScript types auto-generated
- ✅ **Migration Safety**: Prisma handles schema changes safely
- ✅ **Query Optimization**: Indexes defined at schema level

### Task 1.1: Update User Model

**Purpose**: Align User model with multi-tenant requirements while maintaining backward compatibility.

**Why**:

- **UUIDs vs CUID**:
  - **UUIDs** (Universally Unique Identifiers) are 128-bit identifiers that are globally unique across all systems, databases, and time
  - **CUID** (Collision-resistant Unique Identifier) is a shorter, URL-safe ID but less standard
  - **For distributed systems**: UUIDs can be generated independently by multiple servers/databases without coordination, preventing collisions
  - **For multi-tenant**: When data might be merged, replicated, or shared across systems, UUIDs ensure no ID conflicts between tenants or systems
  - **Database-native**: PostgreSQL has built-in UUID support (`gen_random_uuid()`) which is faster and more efficient than application-generated IDs
  - **Example**: If you merge two databases or replicate data, UUIDs won't collide, but sequential IDs (1, 2, 3...) or CUIDs might
- **Case-insensitive email matching**: Prevents duplicate accounts (e.g., "User@Example.com" and "user@example.com" are treated as the same)
- **Relations enable user-to-tenant associations**: Foreign key relationships require consistent ID types across all models

**Benefits**:

- ✅ Consistent ID format across all models
- ✅ Prevents email case-sensitivity issues
- ✅ Enables user-tenant relationships
- ✅ Maintains existing OTP authentication

**Problem Solved**: User model needs to support tenant relationships and UUID format for consistency.

- [ ] Review existing User model fields
- [ ] Add missing fields if needed (ensure email/phone alignment with requirements)
- [ ] Change `id` from `cuid()` to `@default(dbgenerated("gen_random_uuid()")) @db.Uuid`
- [ ] Update email field to use `@db.Citext` for case-insensitive matching
- [ ] Add `phoneNumber` field if using different naming (align with existing `phoneNumber` or `phone`)
- [ ] Ensure `status` field exists with proper enum values
- [ ] Add relations for new models (UserRole, etc.)
- [ ] Test migration doesn't break existing data

### Task 1.2: Create Tenant Model

**Purpose**: Represent organizations/clients in the system. Each tenant is an isolated entity with its own data and users.

**Why**:

- Core entity for multi-tenancy - every operation is tenant-scoped
- Tenant isolation ensures data security and privacy
- Enables billing, reporting, and management per organization

**Benefits**:

- ✅ Data isolation at database level
- ✅ Tenant-specific configurations possible
- ✅ Easy to suspend/activate tenants
- ✅ Supports tenant codes for external integrations

**Problem Solved**:

- **Problem**: No way to represent multiple organizations
- **Solution**: Tenant model with unique name/code and status management

- [ ] Add Tenant model with all required fields
- [ ] Add indexes for performance (name, code, status)
- [ ] Add relations to UserRole (removed: Invitation, CatalogProduct)
- [ ] Ensure proper cascade delete behavior

### Task 1.3: Create RBAC Models (Role, Permission, RolePermission)

**Purpose**: Implement flexible, data-driven role-based access control. Permissions are granular (module:action), and roles can be global or tenant-scoped.

**Why**:

- **Flexibility**: Add new permissions without code changes
- **Granularity**: Module:action format (e.g., `user:edit`, `tenant:create`) is intuitive
- **Scope Separation**: Global roles (super_admin) vs tenant roles (tenant_admin)
- **Maintainability**: Changes to permissions don't require code deployment

**Benefits**:

- ✅ Dynamic permission system (no hardcoded checks)
- ✅ Easy to add new permissions
- ✅ Clear separation of global vs tenant permissions
- ✅ Supports complex permission hierarchies

**Problem Solved**:

- **Problem**: Hardcoded permission checks are inflexible
- **Solution**: Database-driven RBAC with module:action structure
- **Problem**: Need different permission sets for global vs tenant operations
- **Solution**: Role scope field distinguishes global from tenant roles

- [ ] Create Role model with scope field ('global' | 'tenant')
- [ ] Create Permission model with module/action structure
- [ ] Create RolePermission junction table
- [ ] Add proper indexes and constraints
- [ ] Add relations to UserRole

### Task 1.4: Create UserRole Model

**Purpose**: Junction table connecting users to roles within tenant contexts. Enables users to have different roles in different tenants.

**Why**:

- **Multi-Tenant Access**: User can be admin in Tenant A, viewer in Tenant B
- **Status Management**: Support active roles, revoked access (pending status for future use)
- **Audit Trail**: Track when roles were assigned
- **Flexibility**: Same user, different permissions per tenant

**Benefits**:

- ✅ Users can belong to multiple tenants with different roles
- ✅ Status tracking (pending/active/revoked) for access management
- ✅ Historical record of role assignments
- ✅ Supports role revocation without deletion

**Problem Solved**:

- **Problem**: Users need different access levels in different organizations
- **Solution**: UserRole with tenantId allows role-per-tenant assignment
- **Problem**: Need to track role assignment lifecycle
- **Solution**: Status field supports pending → active → revoked flow

- [ ] Create UserRole model with userId, roleId, tenantId
- [ ] Add status field ('active' | 'pending' | 'revoked')
- [ ] Add proper indexes (userId, roleId, tenantId combination)
- [ ] Add foreign key constraints with cascade deletes
- [ ] Note: DB-level scope enforcement will be added in Milestone 2

### Task 1.5: ~~Create Invitation Model~~ (REMOVED - Phase 2)

**Note**: Invitation flow removed. Admins will search for existing registered users by email and assign roles directly.

### Task 1.6: ~~Create ApprovalRequest Model~~ (REMOVED - Phase 2)

**Note**: Approval workflow removed. Role assignments will be direct without approval process.

### Task 1.7: Create RefreshToken Model

**Purpose**: Store refresh tokens with tenant context. Enables secure token rotation and session management per tenant.

**Why**:

- **Security**: Refresh tokens stored in DB can be revoked
- **Tenant Context**: Tokens are bound to specific tenant (or global)
- **Audit**: Track where tokens were issued (IP, user agent)
- **Revocation**: Ability to revoke tokens on logout or security breach

**Benefits**:

- ✅ Secure token storage with hashing
- ✅ Tenant-scoped sessions
- ✅ Token revocation capability
- ✅ Security audit (IP/user agent tracking)

**Problem Solved**:

- **Problem**: Need to maintain sessions with tenant context
- **Solution**: RefreshToken includes tenantId
- **Problem**: Need to revoke tokens for security
- **Solution**: revokedAt field and database storage

- [ ] Create RefreshToken model with tenantId support
- [ ] Add tokenHash field (Bytes type)
- [ ] Add relations to User and Tenant
- [ ] Add indexes for userId, revokedAt, expiresAt
- [ ] Add ip and userAgent fields

### Task 1.8: Create PolicyMeta Model

**Purpose**: Track policy version changes. When roles/permissions change, increment version to invalidate cached permissions and force token refresh.

**Why**:

- **Cache Invalidation**: Permission changes require cache refresh
- **Token Validation**: Tokens include policyVer to detect stale permissions
- **Security**: Ensures permission changes take effect immediately
- **Simplicity**: Single record tracks all policy changes

**Benefits**:

- ✅ Automatic cache invalidation on permission changes
- ✅ Token-based permission staleness detection
- ✅ Simple version tracking mechanism
- ✅ No need to track individual permission changes

**Problem Solved**:

- **Problem**: Permission changes need to invalidate cached permissions
- **Solution**: Policy version increments on any RBAC change
- **Problem**: Tokens might have stale permissions
- **Solution**: Tokens include policyVer, can be validated

- [ ] Create PolicyMeta model (singleton with id='policy')
- [ ] Add policyVer field (Int, default 1)
- [ ] Add updatedAt timestamp

### Task 1.9: Create AuditLog Model

**Purpose**: Comprehensive audit trail of all system actions. Required for compliance, security, and debugging.

**Why**:

- **Compliance**: Many regulations require audit logs (SOX, GDPR, etc.)
- **Security**: Track who did what, when, and from where
- **Debugging**: Before/after JSON helps troubleshoot issues
- **Accountability**: Complete record of all changes

**Benefits**:

- ✅ Complete audit trail for compliance
- ✅ Security incident investigation
- ✅ Change tracking with before/after states
- ✅ Tenant-scoped audit logs for isolation

**Problem Solved**:

- **Problem**: Need to track all system actions for compliance
- **Solution**: AuditLog captures all operations with context
- **Problem**: Need to see what changed in operations
- **Solution**: beforeJson/afterJson stores state changes

- [ ] Create AuditLog model with BigInt id
- [ ] Add all audit fields (actorUserId, tenantId, action, resource, etc.)
- [ ] Add relations to User and Tenant
- [ ] Add indexes for tenantId, actorUserId, ts queries
- [ ] Use Json type for beforeJson/afterJson

### Task 1.10: ~~Create Catalog Models~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase. Focus on core RBAC and tenant management first.

### Task 1.11: Generate Prisma Client

- [ ] Run `prisma generate` to ensure client is updated
- [ ] Verify all models are accessible in TypeScript
- [ ] Check for any type errors

### Task 1.12: Create Initial Migration

- [ ] Create migration: `prisma migrate dev --name add_multi_tenant_rbac`
- [ ] Review generated SQL
- [ ] Test migration on clean database
- [ ] Document any manual SQL adjustments needed

---

## **MILESTONE 2: Database Constraints & Views**

**Goal**: Add DB-level enforcement, triggers, and views for data integrity

### **Why This Milestone?**

Database-level constraints provide the strongest guarantee of data integrity. Application-level checks can be bypassed, but database constraints cannot.

**Why**:

- **Data Integrity**: Enforce business rules at the database level
- **Security**: Prevent invalid data even if application has bugs
- **Performance**: Views and indexes optimize permission queries
- **Consistency**: Single source of truth for permission calculations

### **What Problem It Solves**

- **Problem**: Application code might have bugs allowing invalid role assignments
- **Solution**: Database triggers enforce role scope rules
- **Problem**: Permission queries are complex and slow
- **Solution**: Materialized view pre-computes effective permissions
- **Problem**: Duplicate invitations or role assignments possible
- **Solution**: Unique indexes prevent duplicates

### **Benefits**

- ✅ **Bulletproof Integrity**: Database enforces rules even if code is wrong
- ✅ **Performance**: Views optimize complex permission queries
- ✅ **Consistency**: All applications using the database get same rules
- ✅ **Audit**: Constraints themselves are auditable

### Task 2.1: Create Migration File for Constraints

- [ ] Create new migration file: `YYYYMMDDHHMMSS_add_rbac_constraints.sql`
- [ ] Document all constraints to be added
- [ ] Note: Skip invitation and approval-related constraints (removed in Phase 2)

### Task 2.2: Add UserRole Scope Enforcement Trigger

**Purpose**: Enforce that global roles can't have tenantId and tenant roles must have tenantId. Prevents data corruption and security issues.

**Why**:

- **Security**: Prevents assigning global roles to tenants (or vice versa)
- **Data Integrity**: Ensures role scope matches assignment context
- **Early Detection**: Catches errors at insert time, not runtime
- **Consistency**: All role assignments follow same rules

**Benefits**:

- ✅ Prevents invalid role assignments
- ✅ Clear error messages for developers
- ✅ Enforced at database level (can't be bypassed)
- ✅ Maintains referential integrity

**Problem Solved**:

- **Problem**: Application might assign global role with tenantId (or vice versa)
- **Solution**: Database trigger validates scope before insert/update
- **Problem**: Invalid assignments cause runtime errors
- **Solution**: Validation at database level catches errors early

- [ ] Create trigger function to validate role scope:
  - Global roles → tenantId must be NULL
  - Tenant roles → tenantId must NOT be NULL
- [ ] Add trigger on UserRole INSERT/UPDATE
- [ ] Test trigger with valid and invalid data
- [ ] Add error messages for constraint violations

### Task 2.3: ~~Add Invitation Scope Enforcement Trigger~~ (REMOVED - Phase 2)

**Note**: Invitation model removed, no trigger needed.

### Task 2.4: ~~Add Partial Unique Index for Invitations~~ (REMOVED - Phase 2)

**Note**: Invitation model removed, no index needed.

### Task 2.5: Add Partial Unique Index for UserRole

- [ ] Create unique index:
  ```sql
  CREATE UNIQUE INDEX idx_user_role_tenant_unique
  ON "UserRole" (user_id, role_id, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid));
  ```
- [ ] Test prevents duplicate role assignments
- [ ] Verify allows same role in different tenants

### Task 2.6: Create v_user_effective_perms View

**Purpose**: Pre-computed view of all user permissions across all tenants. Optimizes permission checks by avoiding complex JOINs in application code.

**Why**:

- **Performance**: Single query gets all permissions instead of multiple JOINs
- **Simplicity**: Application code queries view instead of complex joins
- **Consistency**: Same permission calculation logic everywhere
- **Caching**: View results can be cached more easily

**Benefits**:

- ✅ Fast permission lookups (single query)
- ✅ Consistent permission calculation
- ✅ Easy to query from application code
- ✅ Can be materialized for even better performance

**Problem Solved**:

- **Problem**: Permission checks require complex JOINs (UserRole → Role → RolePermission → Permission)
- **Solution**: View pre-computes the join, application queries simple view
- **Problem**: Permission queries are slow and repeated
- **Solution**: View is optimized and can be indexed/materialized

- [ ] Create SQL view for effective permissions:
  ```sql
  CREATE OR REPLACE VIEW v_user_effective_perms AS
  SELECT
    ur.user_id,
    ur.tenant_id,
    r.slug AS role_slug,
    p.module,
    p.action,
    p.slug AS permission_slug
  FROM "UserRole" ur
  JOIN "Role" r ON r.id = ur.role_id
  JOIN "RolePermission" rp ON rp.role_id = r.id
  JOIN "Permission" p ON p.id = rp.permission_id
  WHERE ur.status = 'active';
  ```
- [ ] Test view returns correct permissions
- [ ] Verify performance with indexes
- [ ] Add Prisma view definition (if supported) or document raw SQL usage

### Task 2.7: ~~Add Self-Approval Prevention Trigger~~ (REMOVED - Phase 2)

**Note**: Approval workflow removed, no trigger needed.

### Task 2.8: Apply Migration

- [ ] Run migration on development database
- [ ] Test all constraints and triggers
- [ ] Document any edge cases
- [ ] Create rollback script if needed

---

## **MILESTONE 3: Backend Core Services & Utilities**

**Goal**: Build foundational services for RBAC operations

### **Why This Milestone?**

Services encapsulate business logic and provide reusable functions. They separate concerns from route handlers and make code testable and maintainable.

**Why**:

- **Separation of Concerns**: Business logic separate from HTTP handling
- **Reusability**: Services can be used by multiple routes
- **Testability**: Services can be unit tested independently
- **Maintainability**: Changes to business logic in one place

### **What Problem It Solves**

- **Problem**: Business logic scattered across route handlers
- **Solution**: Centralized service layer
- **Problem**: Duplicate code in different endpoints
- **Solution**: Reusable service methods
- **Problem**: Difficult to test business logic
- **Solution**: Services can be tested in isolation

### **Benefits**

- ✅ **Clean Architecture**: Clear separation of layers
- ✅ **DRY Principle**: No code duplication
- ✅ **Testability**: Easy to unit test services
- ✅ **Maintainability**: Single place to update business logic

### Task 3.1: Create Tenant Service

**Purpose**: Centralized service for all tenant operations. Handles CRUD operations, validation, and audit logging.

**Why**:

- **Business Logic**: Encapsulates tenant management logic
- **Reusability**: Used by admin endpoints and other services
- **Validation**: Ensures tenant data integrity
- **Audit**: Logs all tenant operations for compliance

**Benefits**:

- ✅ Single place for tenant operations
- ✅ Consistent validation and error handling
- ✅ Complete audit trail
- ✅ Easy to test and maintain

**Problem Solved**:

- **Problem**: Tenant operations scattered across codebase
- **Solution**: Centralized service with all tenant methods
- **Problem**: No audit trail for tenant changes
- **Solution**: Service automatically logs all operations

- [ ] Create `src/services/tenantService.ts`
- [ ] Implement `getTenantById(id: string)`
- [ ] Implement `getAllTenants()`
- [ ] Implement `createTenant(data: CreateTenantInput)`
- [ ] Implement `updateTenant(id: string, data: UpdateTenantInput)`
- [ ] Implement `suspendTenant(id: string)`
- [ ] Add error handling and validation
- [ ] Add audit logging for tenant operations

### Task 3.2: Create Role Service

- [ ] Create `src/services/roleService.ts`
- [ ] Implement `getAllRoles(scope?: 'global' | 'tenant')`
- [ ] Implement `getRoleById(id: string)`
- [ ] Implement `getRoleBySlug(slug: string)`
- [ ] Implement `createRole(data: CreateRoleInput)`
- [ ] Implement `updateRole(id: string, data: UpdateRoleInput)`
- [ ] Implement `getRolePermissions(roleId: string)`
- [ ] Add permission management methods

### Task 3.3: Create Permission Service

- [ ] Create `src/services/permissionService.ts`
- [ ] Implement `getAllPermissions()`
- [ ] Implement `getPermissionBySlug(slug: string)`
- [ ] Implement `createPermission(data: CreatePermissionInput)`
- [ ] Implement `getPermissionsByModule(module: string)`
- [ ] Add validation for module/action format

### Task 3.4: Create UserRole Service

- [ ] Create `src/services/userRoleService.ts`
- [ ] Implement `getUserRoles(userId: string, tenantId?: string)`
- [ ] Implement `getUserTenants(userId: string)`
- [ ] Implement `assignRole(userId: string, roleId: string, tenantId?: string)`
- [ ] Implement `revokeRole(userId: string, roleId: string, tenantId?: string)`
- [ ] Implement `checkUserHasRole(userId: string, roleSlug: string, tenantId?: string)`
- [ ] Add validation for role scope matching tenantId

### Task 3.5: Create Permission Check Service

**Purpose**: Centralized permission checking logic. Queries the v_user_effective_perms view and handles super_admin special case. Includes caching for performance.

**Why**:

- **Performance**: Caching reduces database queries
- **Consistency**: Single source of truth for permission checks
- **Super Admin Handling**: Special case for super_admin (has all permissions)
- **Reusability**: Used by middleware and route handlers

**Benefits**:

- ✅ Fast permission checks with Redis caching
- ✅ Consistent permission logic across application
- ✅ Handles super_admin edge case automatically
- ✅ Cache invalidation on policy changes

**Problem Solved**:

- **Problem**: Permission checks are slow (complex queries)
- **Solution**: Redis caching with view-based queries
- **Problem**: Super admin needs special handling
- **Solution**: Service handles super_admin case automatically
- **Problem**: Permission logic duplicated in multiple places
- **Solution**: Centralized service used everywhere

- [ ] Create `src/services/permissionService.ts` (or extend existing)
- [ ] Implement `getUserEffectivePermissions(userId: string, tenantId?: string)`
  - Query v_user_effective_perms view
  - Handle super_admin special case (all permissions)
- [ ] Implement `hasPermission(userId: string, permissionSlug: string, tenantId?: string)`
- [ ] Implement `hasAnyPermission(userId: string, permissionSlugs: string[], tenantId?: string)`
- [ ] Add caching layer (Redis) for performance
- [ ] Implement cache invalidation on role/permission changes

### Task 3.6: ~~Create Invitation Service~~ (REMOVED - Phase 2)

**Note**: Invitation flow removed. Admins will search for existing users and assign roles directly.

### Task 3.7: ~~Create Approval Service~~ (REMOVED - Phase 2)

**Note**: Approval workflow removed. Role assignments are direct.

### Task 3.8: Create Policy Service

- [ ] Create `src/services/policyService.ts`
- [ ] Implement `getPolicyVersion()`
- [ ] Implement `incrementPolicyVersion()`
- [ ] Add method to check if policy has changed (for token refresh)

### Task 3.9: Create Audit Service

- [ ] Create `src/services/auditService.ts`
- [ ] Implement `logAction(data: AuditLogInput)`
- [ ] Implement `getAuditLogs(filters: AuditLogFilters)`
- [ ] Implement `getTenantAuditLogs(tenantId: string, filters: AuditLogFilters)`
- [ ] Add helper methods for common audit actions
- [ ] Add IP and user agent capture

### Task 3.10: ~~Create Catalog Service~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 3.11: Create Type Definitions

- [ ] Create `src/types/rbac.ts` for RBAC-related types
- [ ] Create `src/types/tenant.ts` for tenant types
- [ ] ~~Create `src/types/catalog.ts`~~ (REMOVED - Phase 2)
- [ ] Create `src/types/auth.ts` for extended auth types
- [ ] Export all types from index file

---

## **MILESTONE 4: Authentication & Authorization Middleware**

**Goal**: Extend auth system to support tenant context and permissions

### **Why This Milestone?**

Middleware is the gatekeeper for all requests. It validates authentication, extracts tenant context, and checks permissions before requests reach handlers.

**Why**:

- **Security**: Enforce authentication and authorization at request level
- **Context Extraction**: Parse tenantId and permissions from tokens
- **Reusability**: Middleware can be applied to multiple routes
- **Early Rejection**: Invalid requests rejected before business logic runs

### **What Problem It Solves**

- **Problem**: Need to check permissions in every route handler
- **Solution**: Permission middleware handles checks automatically
- **Problem**: Tenant context needs to be extracted from tokens
- **Solution**: Tenant context middleware extracts and validates
- **Problem**: Token management is complex
- **Solution**: Token service handles generation, validation, refresh

### **Benefits**

- ✅ **Security**: Centralized auth/authorization checks
- ✅ **DRY**: No duplicate permission checks in routes
- ✅ **Performance**: Early rejection of invalid requests
- ✅ **Consistency**: Same auth logic for all routes

### Task 4.1: Update Auth Context Interface

- [ ] Extend `AuthenticatedRequest` interface in `src/middleware/auth.ts`
- [ ] Add `tenantId?: string` to request context
- [ ] Add `permissions?: string[]` to request context
- [ ] Add `isSuperAdmin?: boolean` to request context
- [ ] Add `policyVer?: number` to request context

### Task 4.2: Create Token Service

- [ ] Create `src/services/tokenService.ts`
- [ ] Implement `generateAccessToken(payload: TokenPayload)`
- [ ] Implement `generateRefreshToken(payload: TokenPayload)`
- [ ] Implement `verifyAccessToken(token: string)`
- [ ] Implement `verifyRefreshToken(token: string)`
- [ ] Add token expiration configuration
- [ ] Store refresh tokens in database (RefreshToken model)

### Task 4.3: Update OTP Verify Endpoint

- [ ] Modify `src/routes/authRoutes.ts` - `/auth/login/verify`
- [ ] After OTP verification, generate short-lived session token
- [ ] Return token with userId (no tenantId yet)
- [ ] Update response to include `requiresTenantSelection: true`
- [ ] Maintain backward compatibility

### Task 4.4: Create Tenant Selection Endpoint

**Purpose**: After OTP login, user needs to see available tenants. Super admins see all tenants plus global admin option.

**Why**:

- **User Experience**: Users need to choose which tenant to work in
- **Super Admin**: Special handling to show all tenants
- **Security**: Only show tenants user has access to
- **Performance**: Caching reduces database load

**Benefits**:

- ✅ Clear tenant selection UI data
- ✅ Super admin sees all options
- ✅ Fast response with caching
- ✅ Secure (only accessible tenants shown)

**Problem Solved**:

- **Problem**: After login, user doesn't know which tenants they can access
- **Solution**: Endpoint returns user's accessible tenants
- **Problem**: Super admin needs to see all tenants
- **Solution**: Special query for super_admin role

- [ ] Create `[GET] /api/auth/tenants` endpoint
- [ ] Query user's tenants via UserRole
- [ ] Check if user has super_admin role (global scope)
- [ ] If super_admin, include all tenants + global admin option
- [ ] Return list with tenant details and user's roles per tenant
- [ ] Add caching for performance

### Task 4.5: Create Tenant Context Selection Endpoint

**Purpose**: After tenant selection, establish session with tenant context. Generates tokens bound to specific tenant (or global for super admin).

**Why**:

- **Session Establishment**: Creates authenticated session with tenant context
- **Token Binding**: Tokens include tenantId for all subsequent requests
- **Security**: Only super_admin can select null (global admin)
- **Audit**: Log tenant selection for security tracking

**Benefits**:

- ✅ Secure token generation with tenant context
- ✅ Refresh token stored in database (revocable)
- ✅ Policy version included (for permission staleness detection)
- ✅ Complete audit trail

**Problem Solved**:

- **Problem**: Need to establish session with tenant context after selection
- **Solution**: Endpoint generates tokens with tenantId
- **Problem**: Tokens need to be revocable
- **Solution**: Refresh tokens stored in database

- [ ] Create `[POST] /api/auth/session/select-tenant` endpoint
- [ ] Validate tenantId (null allowed only for super_admin)
- [ ] Generate access token with userId + tenantId + policyVer
- [ ] Generate refresh token and store in RefreshToken table
- [ ] Return access token, refresh token, and user context
- [ ] Add audit log for tenant selection

### Task 4.6: Update /me Endpoint

- [ ] Modify `src/routes/me.ts` - `[GET] /api/me`
- [ ] Extract tenantId from token/session
- [ ] Query user's effective permissions using v_user_effective_perms
- [ ] Include super_admin check
- [ ] Return user profile + current tenant + roles + permissions
- [ ] Add policyVer to response

### Task 4.7: Create Permission Middleware

**Purpose**: Reusable middleware to check permissions before route handlers execute. Provides clean, declarative permission checks.

**Why**:

- **DRY Principle**: No duplicate permission checks in routes
- **Security**: Centralized permission enforcement
- **Clarity**: Routes clearly show required permissions
- **Early Rejection**: Invalid requests rejected before business logic

**Benefits**:

- ✅ Clean route definitions with permission decorators
- ✅ Consistent permission checking
- ✅ Helpful error messages for debugging
- ✅ Easy to add new permission checks

**Problem Solved**:

- **Problem**: Permission checks duplicated in every route
- **Solution**: Reusable middleware functions
- **Problem**: Inconsistent permission checking logic
- **Solution**: Single source of truth for permission checks
- **Problem**: Unclear what permissions routes require
- **Solution**: Middleware makes requirements explicit

- [ ] Create `src/middleware/permission.ts`
- [ ] Implement `requirePermission(permissionSlug: string)` middleware
- [ ] Implement `requireAnyPermission(permissionSlugs: string[])` middleware
- [ ] Implement `requireSuperAdmin()` middleware
- [ ] Implement `requireTenantAdmin()` middleware
- [ ] Add tenant context validation
- [ ] Add helpful error messages

### Task 4.8: Create Tenant Context Middleware

- [ ] Create `src/middleware/tenantContext.ts`
- [ ] Implement `requireTenantContext()` middleware
- [ ] Implement `optionalTenantContext()` middleware
- [ ] Validate tenantId exists in database
- [ ] Validate user has access to tenant
- [ ] Add tenant to request context

### Task 4.9: Create Refresh Token Endpoint

- [ ] Create `[POST] /api/auth/refresh` endpoint
- [ ] Validate refresh token from database
- [ ] Check if token is revoked or expired
- [ ] Generate new access token with same context
- [ ] Optionally rotate refresh token
- [ ] Return new tokens

### Task 4.10: Update Logout Endpoint

- [ ] Modify logout to revoke refresh tokens
- [ ] Clear session
- [ ] Add audit log
- [ ] Support tenant-scoped logout

### Task 4.11: Create Auth Service Extensions

- [ ] Extend `src/services/authService.ts`
- [ ] Add `getUserTenants(userId: string)` method
- [ ] Add `isSuperAdmin(userId: string)` method
- [ ] Add `getUserContext(userId: string, tenantId?: string)` method
- [ ] Maintain existing OTP methods

---

## **MILESTONE 5: Admin Endpoints (Super Admin)**

**Goal**: Implement global administration endpoints

### **Why This Milestone?**

Super admin needs APIs to manage the entire system: tenants, roles, permissions, users, and audit logs. These endpoints are only accessible in global context (no tenantId).

**Why**:

- **System Management**: Super admin needs to manage all tenants
- **RBAC Management**: Create and manage roles/permissions
- **User Management**: Invite users, assign roles across tenants
- **Audit Access**: View system-wide audit logs

### **What Problem It Solves**

- **Problem**: No way to manage tenants programmatically
- **Solution**: Tenant CRUD endpoints
- **Problem**: Roles and permissions need to be configurable
- **Solution**: Role/permission management endpoints
- **Problem**: Need to assign roles to existing users
- **Solution**: User search and direct role assignment endpoints

### **Benefits**

- ✅ **Complete Control**: Super admin can manage entire system
- ✅ **RBAC Flexibility**: Dynamic role/permission management
- ✅ **Security**: All operations require super_admin permission
- ✅ **Audit**: All admin actions are logged

### Task 5.1: Create Admin Routes Structure

- [ ] Create `src/routes/admin/` directory
- [ ] Create `src/routes/admin/roles.ts`
- [ ] Create `src/routes/admin/tenants.ts`
- [ ] ~~Create `src/routes/admin/invitations.ts`~~ (REMOVED - Phase 2)
- [ ] Create `src/routes/admin/users.ts`
- [ ] Create `src/routes/admin/index.ts` to aggregate routes

### Task 5.2: Implement Role Management Endpoints

- [ ] `[GET] /api/admin/roles` - List all roles
- [ ] `[POST] /api/admin/roles` - Create role
- [ ] `[GET] /api/admin/roles/:id` - Get role details
- [ ] `[PATCH] /api/admin/roles/:id` - Update role
- [ ] Add validation schemas
- [ ] Add requireSuperAdmin middleware
- [ ] Increment policyVer on changes
- [ ] Add audit logging

### Task 5.3: Implement Permission Management Endpoints

- [ ] `[GET] /api/admin/permissions` - List all permissions
- [ ] `[POST] /api/admin/permissions` - Create permission
- [ ] `[GET] /api/admin/permissions/:id` - Get permission details
- [ ] Add validation
- [ ] Add requireSuperAdmin middleware
- [ ] Increment policyVer on changes

### Task 5.4: Implement Role-Permission Management

- [ ] `[GET] /api/admin/roles/:roleId/permissions` - Get role permissions
- [ ] `[POST] /api/admin/roles/:roleId/permissions` - Assign permission to role
- [ ] `[DELETE] /api/admin/roles/:roleId/permissions/:permissionId` - Remove permission
- [ ] Add validation
- [ ] Increment policyVer on changes
- [ ] Add audit logging

### Task 5.5: Implement Tenant Management Endpoints

- [ ] `[GET] /api/admin/tenants` - List all tenants
- [ ] `[POST] /api/admin/tenants` - Create tenant
- [ ] `[GET] /api/admin/tenants/:id` - Get tenant details
- [ ] `[PATCH] /api/admin/tenants/:id` - Update tenant
- [ ] `[POST] /api/admin/tenants/:id/suspend` - Suspend tenant
- [ ] `[POST] /api/admin/tenants/:id/activate` - Activate tenant
- [ ] Add validation schemas
- [ ] Add requireSuperAdmin middleware
- [ ] Add audit logging

### Task 5.6: Implement User Search & Role Assignment Endpoints

**Purpose**: Allow admins to search for existing registered users by email and assign roles directly without invitation flow.

**Why**:

- **Simplicity**: Direct role assignment without invitation workflow
- **User Search**: Admins can find users by email from existing registered users
- **Immediate Access**: Roles assigned immediately without approval process
- **Flexibility**: Works for both super_admin and tenant_admin

**Benefits**:

- ✅ Simple and straightforward user management
- ✅ No invitation tokens or email sending needed
- ✅ Immediate role assignment
- ✅ Search functionality for finding users

**Problem Solved**:

- **Problem**: Need to assign roles to existing users
- **Solution**: Search users by email and assign roles directly
- **Problem**: Invitation flow is complex for Phase 1
- **Solution**: Simplified direct assignment

- [ ] `[GET] /api/admin/users/search?email=...` - Search users by email
- [ ] `[POST] /api/admin/tenants/:tenantId/users/:userId/roles` - Assign role to user (already exists in 5.7)
- [ ] `[GET] /api/admin/users` - List all registered users (with filters)
- [ ] Add email search validation
- [ ] Add requireSuperAdmin or requireTenantAdmin middleware
- [ ] Add audit logging for role assignments

### Task 5.7: Implement User-Role Management Endpoints

- [ ] `[GET] /api/admin/tenants/:tenantId/users` - List users in tenant
- [ ] `[POST] /api/admin/tenants/:tenantId/users/:userId/roles` - Grant role
- [ ] `[DELETE] /api/admin/tenants/:tenantId/users/:userId/roles/:roleId` - Revoke role
- [ ] `[GET] /api/admin/tenants/:tenantId/users/:userId/roles` - Get user roles
- [ ] Add validation
- [ ] Add permission checks
- [ ] Add audit logging

### Task 5.8: Implement Audit Log Endpoints

- [ ] `[GET] /api/admin/audit-logs` - Get global audit logs
- [ ] `[GET] /api/admin/tenants/:tenantId/audit-logs` - Get tenant audit logs
- [ ] Add filtering (date range, action, user, etc.)
- [ ] Add pagination
- [ ] Add requireSuperAdmin middleware
- [ ] Optimize queries with proper indexes

### Task 5.9: Mount Admin Routes

- [ ] Update `src/server.ts`
- [ ] Mount `/api/admin/*` routes
- [ ] Add requireSuperAdmin middleware to admin router
- [ ] Test route accessibility

### Task 5.10: Create Admin Validation Schemas

- [ ] Create `src/schemas/adminSchemas.ts`
- [ ] Add schemas for role creation/update
- [ ] Add schemas for permission creation
- [ ] Add schemas for tenant creation/update
- [ ] Add schemas for user search (email query)
- [ ] Add schemas for role assignment
- [ ] Use Zod for validation

---

## **MILESTONE 6: Tenant-Scoped Endpoints**

**Goal**: Implement tenant-specific operations (tenant admin functions)

### **Why This Milestone?**

Tenant-scoped endpoints operate within a specific tenant context. All operations are isolated to that tenant's data.

**Why**:

- **Data Isolation**: All operations scoped to specific tenant
- **Permission Checks**: Verify user has permission in that tenant
- **Tenant Admin Functions**: Tenant admins can manage their tenant
- **User Management**: Tenant admins can assign roles to users in their tenant

### **What Problem It Solves**

- **Problem**: Tenant admins need to manage their tenant
- **Solution**: Tenant admin endpoints with permission checks
- **Problem**: Need tenant-specific user management
- **Solution**: Tenant-scoped user and role endpoints

### **Benefits**

- ✅ **Data Isolation**: Complete tenant data separation
- ✅ **Permission-Based**: Access controlled by RBAC
- ✅ **Flexible**: Tenant admins can manage their tenants
- ✅ **Simple**: Direct role assignment without complex workflows

### Task 6.1: Create Tenant Routes Structure

- [ ] Create `src/routes/tenants/` directory
- [ ] ~~Create `src/routes/tenants/catalog.ts`~~ (REMOVED - Phase 2)
- [ ] Create `src/routes/tenants/users.ts`
- [ ] Create `src/routes/tenants/index.ts`

### Task 6.2: ~~Implement Catalog Endpoints~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 6.3: ~~Implement Catalog Upload Endpoint~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 6.4: ~~Implement Catalog Upload Processing~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 6.5: Implement Tenant User Management (Tenant Admin)

**Purpose**: Allow tenant admins to manage users and roles within their tenant. Includes user search and role assignment.

**Why**:

- **Tenant Admin Control**: Tenant admins need to manage their tenant's users
- **User Search**: Search for existing registered users by email
- **Role Assignment**: Direct role assignment without invitation flow
- **Scope Restriction**: Only tenant-scoped roles can be assigned

**Benefits**:

- ✅ Tenant admins can manage their tenant
- ✅ Simple user search and role assignment
- ✅ Restricted to tenant-scoped roles only
- ✅ Complete audit trail

**Problem Solved**:

- **Problem**: Tenant admins need to assign roles to users
- **Solution**: User search and direct role assignment endpoints
- **Problem**: Need to prevent assigning global roles in tenant context
- **Solution**: Middleware restricts to tenant-scoped roles only

- [ ] `[GET] /api/tenants/:tenantId/users` - List users in tenant
- [ ] `[GET] /api/tenants/:tenantId/users/search?email=...` - Search users by email
- [ ] `[POST] /api/tenants/:tenantId/users/:userId/roles` - Grant role
- [ ] `[DELETE] /api/tenants/:tenantId/users/:userId/roles/:roleId` - Revoke role
- [ ] Add requireTenantAdmin middleware
- [ ] Restrict to tenant-scoped roles only
- [ ] Add validation
- [ ] Add audit logging

### Task 6.6: Mount Tenant Routes

- [ ] Update `src/server.ts`
- [ ] Mount `/api/tenants/*` routes
- [ ] Add requireTenantContext middleware
- [ ] Test route accessibility

### Task 6.7: Create Tenant Validation Schemas

- [ ] Create `src/schemas/tenantSchemas.ts`
- [ ] ~~Add schemas for product creation/update~~ (REMOVED - Phase 2)
- [ ] ~~Add schemas for catalog upload~~ (REMOVED - Phase 2)
- [ ] Add schemas for tenant user operations
- [ ] Add schemas for user search (email query)

---

## **MILESTONE 7: Frontend - Tenant Selection & Context**

**Goal**: Build React components for tenant selection and context management

### **Why This Milestone?**

Frontend needs to handle tenant selection flow and maintain tenant context throughout the application. This is the user-facing part of multi-tenancy.

**Why**:

- **User Experience**: Users need intuitive tenant selection
- **Context Management**: Frontend must maintain tenant context
- **Permission-Based UI**: Show/hide features based on permissions
- **State Management**: Auth store needs tenant and permission data

### **What Problem It Solves**

- **Problem**: Users don't know which tenant to select after login
- **Solution**: Tenant selection screen with clear options
- **Problem**: Frontend needs to know current tenant context
- **Solution**: Tenant context in auth store and hooks
- **Problem**: UI should reflect user's permissions
- **Solution**: Permission hooks and protected components

### **Benefits**

- ✅ **Intuitive UX**: Clear tenant selection flow
- ✅ **Context Awareness**: App always knows current tenant
- ✅ **Permission-Based UI**: Features shown based on permissions
- ✅ **Reusable Hooks**: Easy permission checks in components

### Task 7.1: Update Auth Store

- [ ] Extend `client/src/store/authStore.js`
- [ ] Add `tenantId` to state
- [ ] Add `permissions` array to state
- [ ] Add `isSuperAdmin` boolean
- [ ] Add `policyVer` number
- [ ] Add `selectTenant(tenantId)` action
- [ ] Add `clearTenant()` action
- [ ] Update persistence logic

### Task 7.2: Create Tenant Service

- [ ] Create `client/src/services/tenantService.js`
- [ ] Implement `getUserTenants()` - calls `/api/auth/tenants`
- [ ] Implement `selectTenant(tenantId)` - calls `/api/auth/session/select-tenant`
- [ ] Implement `getTenantDetails(tenantId)`
- [ ] Add error handling

### Task 7.3: Create Tenant Selection Component

**Purpose**: Post-login screen where users select which tenant to work in (or global admin). Critical UX component for multi-tenancy.

**Why**:

- **User Flow**: Required step after OTP login
- **Super Admin UX**: Shows all tenants + global admin option
- **Visual Clarity**: Card-based UI makes selection obvious
- **Error Handling**: Graceful handling of no-access scenarios

**Benefits**:

- ✅ Clear visual tenant selection
- ✅ Super admin sees all options
- ✅ Handles edge cases (no tenants, errors)
- ✅ Consistent with app theme

**Problem Solved**:

- **Problem**: Users need to choose tenant after login
- **Solution**: Dedicated tenant selection screen
- **Problem**: Super admin needs special options
- **Solution**: Shows global admin and create tenant options

- [ ] Create `client/src/pages/TenantSelection.jsx`
- [ ] Fetch user tenants on mount
- [ ] Display list of tenant cards
- [ ] Show "Global Administration" card if super_admin
- [ ] Show "Create Tenant" button if super_admin
- [ ] Handle tenant selection
- [ ] Handle global admin selection
- [ ] Show loading and error states
- [ ] Use theme for styling

### Task 7.4: Update Login Flow

- [ ] Modify `client/src/pages/VerifyOTP.jsx`
- [ ] After successful OTP verification, check if tenant selection needed
- [ ] Redirect to `/tenant-selection` if needed
- [ ] Otherwise redirect to dashboard
- [ ] Update auth store with user data

### Task 7.5: Create Tenant Context Hook

- [ ] Create `client/src/hooks/useTenantContext.js`
- [ ] Return current tenantId, tenant name, permissions
- [ ] Provide helper methods (hasPermission, isSuperAdmin, etc.)
- [ ] Handle context switching

### Task 7.6: Update MainLayout

- [ ] Modify `client/src/components/layout/MainLayout.jsx`
- [ ] Display current tenant name in header (or "Global Administration")
- [ ] Add "Switch Tenant" option in profile menu
- [ ] Add "Administration" option for super_admin in global context
- [ ] Handle tenant switching flow

### Task 7.7: Create Permission Hook

**Purpose**: React hook for easy permission checking in components. Enables conditional rendering and feature gating based on permissions.

**Why**:

- **Component Logic**: Components need to check permissions
- **Reusability**: Single hook used across all components
- **Performance**: Uses cached permissions from auth store
- **Type Safety**: TypeScript support for permission slugs

**Benefits**:

- ✅ Easy permission checks in components
- ✅ Conditional rendering based on permissions
- ✅ Consistent permission logic
- ✅ No prop drilling needed

**Problem Solved**:

- **Problem**: Components need to check permissions repeatedly
- **Solution**: Reusable hook with cached permissions
- **Problem**: Permission checks scattered in components
- **Solution**: Centralized hook logic
- **Problem**: Need to show/hide UI based on permissions
- **Solution**: Hook returns boolean for conditional rendering

- [ ] Create `client/src/hooks/usePermissions.js`
- [ ] Implement `hasPermission(permissionSlug)` hook
- [ ] Implement `hasAnyPermission(permissionSlugs)` hook
- [ ] Implement `isSuperAdmin()` hook
- [ ] Implement `isTenantAdmin()` hook
- [ ] Use auth store for permission data

### Task 7.8: Create Protected Route with Permissions

- [ ] Create `client/src/components/ProtectedRouteWithPermission.jsx`
- [ ] Extend existing ProtectedRoute
- [ ] Add permission checking
- [ ] Show access denied message if no permission
- [ ] Redirect appropriately

### Task 7.9: Update API Service

- [ ] Modify `client/src/services/api.js`
- [ ] Add tenantId to request headers if available
- [ ] Handle token refresh with tenant context
- [ ] Handle 401 errors and redirect to tenant selection if needed
- [ ] Update interceptor logic

### Task 7.10: Update /me API Call

- [ ] Modify `client/src/services/authService.js`
- [ ] Update `getCurrentUser()` to call `/api/me`
- [ ] Handle new response structure (tenant, permissions, etc.)
- [ ] Update auth store with full context

---

## **MILESTONE 8: Frontend - Admin Pages**

**Goal**: Build admin interfaces for system management

### **Why This Milestone?**

Complete the user-facing features: admin interfaces for super admins to manage the system. These are the main application features.

**Why**:

- **Admin Tools**: Super admins need UI to manage system
- **User Management**: Admins need to search users and assign roles
- **Role Management**: Admins need to manage roles and permissions
- **Audit Access**: View audit logs for compliance

### **What Problem It Solves**

- **Problem**: Super admin needs UI to manage tenants/roles
- **Solution**: Admin pages with full CRUD operations
- **Problem**: Admins need to search and assign roles to existing users
- **Solution**: User search page with direct role assignment
- **Problem**: Need to see who did what (audit)
- **Solution**: Audit log viewer with filters

### **Benefits**

- ✅ **Complete Admin UI**: Full system management interface
- ✅ **User Management**: Search and assign roles to existing users
- ✅ **Role Management**: Create and manage roles and permissions
- ✅ **Compliance**: Audit log viewing for regulatory requirements

### Task 8.1: Create Global Admin Layout

- [ ] Create `client/src/pages/admin/AdminLayout.jsx`
- [ ] Create sidebar navigation for admin sections
- [ ] Add routes for: Tenants, Roles, Permissions, Audit Logs
- [ ] Use theme for styling
- [ ] Add permission checks for menu items

### Task 8.2: Create Tenants Management Page

**Purpose**: Super admin interface to manage all tenants. Provides CRUD operations, status management, and tenant overview.

**Why**:

- **System Management**: Super admin needs to manage tenants
- **Overview**: See all tenants at a glance with key metrics
- **Operations**: Create, edit, suspend tenants from UI
- **User Experience**: Intuitive interface for tenant management

**Benefits**:

- ✅ Complete tenant management UI
- ✅ Quick overview of all tenants
- ✅ Easy tenant creation and editing
- ✅ Status management (suspend/activate)

**Problem Solved**:

- **Problem**: No UI to manage tenants
- **Solution**: Complete tenant management page
- **Problem**: Need to see tenant status and metrics
- **Solution**: List view with status, user count, etc.
- **Problem**: Need to create/edit tenants easily
- **Solution**: Forms and modals for tenant operations

- [ ] Create `client/src/pages/admin/Tenants.jsx`
- [ ] List all tenants with status, user count, etc.
- [ ] Add "Create Tenant" form/modal
- [ ] Add edit tenant functionality
- [ ] Add suspend/activate actions
- [ ] Add search and filters
- [ ] Use React Query for data fetching
- [ ] Add proper error handling

### Task 8.3: Create Roles Management Page

- [ ] Create `client/src/pages/admin/Roles.jsx`
- [ ] List all roles (global and tenant-scoped)
- [ ] Add "Create Role" form
- [ ] Add edit role functionality
- [ ] Show role permissions
- [ ] Add assign/remove permissions UI
- [ ] Use React Query

### Task 8.4: Create Permissions Management Page

- [ ] Create `client/src/pages/admin/Permissions.jsx`
- [ ] List all permissions grouped by module
- [ ] Add "Create Permission" form
- [ ] Show which roles have each permission
- [ ] Use React Query

### Task 8.5: Create Tenant Users Page

- [ ] Create `client/src/pages/admin/TenantUsers.jsx`
- [ ] List users in selected tenant
- [ ] Show user roles
- [ ] Add "Invite User" functionality
- [ ] Add grant/revoke role actions
- [ ] Use React Query
- [ ] Add proper permission checks

### Task 8.6: Create User Search & Role Assignment Page

**Purpose**: Admin interface to search for existing registered users by email and assign roles directly.

**Why**:

- **User Management**: Admins need to find and manage users
- **Email Search**: Search functionality to find users by email
- **Role Assignment**: Direct role assignment UI without invitation flow
- **Simplicity**: Straightforward user management interface

**Benefits**:

- ✅ Simple user search interface
- ✅ Direct role assignment
- ✅ No complex invitation workflow
- ✅ Works for both super_admin and tenant_admin

**Problem Solved**:

- **Problem**: Need UI to assign roles to existing users
- **Solution**: User search page with role assignment
- **Problem**: Invitation flow is complex for Phase 1
- **Solution**: Simplified direct assignment UI

- [ ] Create `client/src/pages/admin/UserManagement.jsx` (or extend existing)
- [ ] Add user search by email input
- [ ] Display search results with user details
- [ ] Show current roles for selected user
- [ ] Add role assignment dropdown/selector
- [ ] Add assign/revoke role actions
- [ ] Use React Query for search and role operations
- [ ] Add proper permission checks

### Task 8.7: Create Audit Logs Page

- [ ] Create `client/src/pages/admin/AuditLogs.jsx`
- [ ] Display audit log table
- [ ] Add filters (date range, action, user, tenant)
- [ ] Add pagination
- [ ] Show before/after JSON in expandable rows
- [ ] Use React Query with infinite scroll or pagination

### Task 8.8: ~~Create Catalog Products Page~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 8.9: ~~Create Catalog Upload Page~~ (REMOVED - Phase 2)

**Note**: Catalog functionality deferred to next phase.

### Task 8.10: Update Routing

- [ ] Update `client/src/App.jsx`
- [ ] Add `/tenant-selection` route
- [ ] Add `/admin/*` routes (protected, super_admin only)
- [ ] Add `/tenants/:tenantId/*` routes (protected, tenant context)
- [ ] Add route guards with permission checks
- [ ] Handle tenant context in route params

### Task 8.11: Create Reusable Admin Components

- [ ] Create `client/src/components/admin/` directory
- [ ] Create `DataTable.jsx` for consistent table display
- [ ] Create `PermissionBadge.jsx` for permission display
- [ ] Create `RoleBadge.jsx` for role display
- [ ] Create `StatusBadge.jsx` for status display
- [ ] Create `UserSearchInput.jsx` for user search by email
- [ ] Create `RoleAssignmentModal.jsx` for role assignment
- [ ] Use theme for styling

### Task 8.12: Add Loading & Error States

- [ ] Add loading skeletons for all admin pages
- [ ] Add error boundaries
- [ ] Add toast notifications for actions
- [ ] Add confirmation dialogs for destructive actions
- [ ] Use consistent error messages

---

## **MILESTONE 9: Seeding & Initial Data**

**Goal**: Create seed data for roles, permissions, and initial super admin

### **Why This Milestone?**

New installations need default roles, permissions, and a super admin user. Seed script ensures consistent initial state.

**Why**:

- **Bootstrap**: New installations need default data
- **Consistency**: Same roles/permissions across all environments
- **Testing**: Seed data enables testing without manual setup
- **Super Admin**: Initial super admin needed to bootstrap system

### **What Problem It Solves**

- **Problem**: New database has no roles/permissions
- **Solution**: Seed script creates default RBAC structure
- **Problem**: No way to access system initially
- **Solution**: Creates initial super_admin user
- **Problem**: Inconsistent data across environments
- **Solution**: Seed ensures consistent initial state

### **Benefits**

- ✅ **Quick Setup**: New environments ready immediately
- ✅ **Consistency**: Same default data everywhere
- ✅ **Testing**: Test data available automatically
- ✅ **Bootstrap**: System usable after seed

### Task 9.1: Update Seed Script

- [ ] Modify `prisma/seed.ts`
- [ ] Create default roles (super_admin, tenant_admin)
- [ ] Create default permissions (all modules)
- [ ] Assign permissions to roles
- [ ] Create initial super_admin user (if needed)
- [ ] Create PolicyMeta record
- [ ] Add error handling

### Task 9.2: Create Default Permissions

**Purpose**: Define all system permissions with module:action format. These are the building blocks of the RBAC system.

**Why**:

- **Foundation**: Permissions define what users can do
- **Granularity**: Module:action format is intuitive and flexible
- **Completeness**: All system operations need permissions
- **Documentation**: Descriptions explain what each permission allows

**Benefits**:

- ✅ Complete permission set for all operations
- ✅ Intuitive naming (module:action)
- ✅ Easy to understand and extend
- ✅ Self-documenting with descriptions

**Problem Solved**:

- **Problem**: Need to define what operations are possible
- **Solution**: Complete permission set covering all features
- **Problem**: Permissions need to be understandable
- **Solution**: Clear module:action naming with descriptions
- **Problem**: System needs permissions to function
- **Solution**: Seed creates all required permissions

- [ ] Define all required permissions:
  - `tenant:create`, `tenant:view`, `tenant:edit`, `tenant:suspend`
  - `user:view`, `user:edit`, `user:revoke` (removed: `user:invite` - no invitation flow)
  - `role:create`, `role:view`, `role:edit`, `role:delete`
  - `permission:create`, `permission:view`
  - ~~`catalog:view`, `catalog:create`, `catalog:edit`, `catalog:upload`~~ (REMOVED - Phase 2)
  - `audit:view`
- [ ] Add descriptions for each permission

### Task 9.3: Create Default Roles

- [ ] Create `super_admin` role (global scope)
  - Assign all permissions
- [ ] Create `tenant_admin` role (tenant scope)
  - Assign tenant-level permissions
- [ ] Add role descriptions

### Task 9.4: Test Seed Script

- [ ] Run seed on clean database
- [ ] Verify all roles and permissions created
- [ ] Verify super_admin has all permissions
- [ ] Verify tenant_admin has correct permissions
- [ ] Test policy version initialization

---

## **MILESTONE 10: Testing & Documentation**

**Goal**: Comprehensive testing and documentation

### **Why This Milestone?**

Testing ensures the system works correctly and documentation helps future developers understand and maintain the system.

**Why**:

- **Quality Assurance**: Catch bugs before production
- **Regression Prevention**: Tests prevent breaking changes
- **Knowledge Transfer**: Documentation helps team understand system
- **Maintenance**: Well-documented code is easier to maintain

### **What Problem It Solves**

- **Problem**: Bugs in production cause issues
- **Solution**: Comprehensive testing catches bugs early
- **Problem**: New developers don't understand system
- **Solution**: Documentation explains architecture and flows
- **Problem**: Changes break existing functionality
- **Solution**: Tests catch regressions automatically

### **Benefits**

- ✅ **Confidence**: Tests prove system works correctly
- ✅ **Documentation**: Future developers can understand system
- ✅ **Regression Prevention**: Tests catch breaking changes
- ✅ **API Clarity**: API docs help frontend/backend integration

### Task 10.1: Backend Unit Tests

- [ ] Test all service methods
- [ ] Test permission checking logic
- [ ] Test tenant context validation
- [ ] Test role scope enforcement
- [ ] Test user search functionality
- [ ] Test role assignment flow

### Task 10.2: Backend Integration Tests

- [ ] Test complete auth flow (OTP → tenant selection → context)
- [ ] Test super_admin flows
- [ ] Test tenant_admin flows
- [ ] Test tenant user management operations
- [ ] Test audit logging
- [ ] Test permission middleware

### Task 10.3: Database Constraint Tests

- [ ] Test UserRole scope enforcement
- [ ] Test unique index constraints
- [ ] Test view performance

### Task 10.4: Frontend Component Tests

- [ ] Test TenantSelection component
- [ ] Test permission hooks
- [ ] Test protected routes
- [ ] Test admin components

### Task 10.5: E2E Testing (Optional)

- [ ] Test complete user journey
- [ ] Test super_admin workflows
- [ ] Test tenant_admin workflows
- [ ] Test user search and role assignment flow

### Task 10.6: API Documentation

- [ ] Document all new endpoints
- [ ] Add request/response examples
- [ ] Document authentication requirements
- [ ] Document permission requirements
- [ ] Create Postman collection (optional)

### Task 10.7: Code Documentation

- [ ] Add JSDoc comments to services
- [ ] Document complex business logic
- [ ] Document permission system
- [ ] Document tenant isolation strategy

### Task 10.8: Migration Guide

- [ ] Document schema changes
- [ ] Document migration steps
- [ ] Document breaking changes
- [ ] Create rollback procedures

---

## **Implementation Order & Dependencies**

### Phase 1: Foundation (Milestones 1-2)

- Must complete before any backend work
- Database schema and constraints are prerequisites

### Phase 2: Backend Core (Milestones 3-4)

- Services can be built in parallel after schema
- Auth middleware depends on services

### Phase 3: Backend Endpoints (Milestones 5-6)

- Admin endpoints depend on services and middleware
- Tenant endpoints depend on tenant context middleware

### Phase 4: Frontend Core (Milestone 7)

- Depends on backend endpoints being ready
- Can start with tenant selection while admin pages are built

### Phase 5: Frontend Features (Milestone 8)

- Depends on all backend endpoints
- Can be built incrementally

### Phase 6: Polish (Milestones 9-10)

- Seeding can be done early for testing
- Testing should be ongoing but formalized here

---

## **Estimated Timeline**

- **Milestone 1**: 1-2 days (reduced - removed invitation and catalog models)
- **Milestone 2**: 1 day (reduced - removed invitation/approval triggers)
- **Milestone 3**: 2-3 days (reduced - removed invitation and catalog services)
- **Milestone 4**: 2-3 days
- **Milestone 5**: 2-3 days (reduced - simplified user management)
- **Milestone 6**: 1-2 days (reduced - removed catalog endpoints)
- **Milestone 7**: 2-3 days
- **Milestone 8**: 3-4 days (reduced - removed catalog pages)
- **Milestone 9**: 1 day
- **Milestone 10**: 2-3 days

**Total Estimated Time**: 17-24 days (3.5-5 weeks)

**Note**: Timeline reduced due to removal of invitation flow and catalog functionality, which will be implemented in Phase 2.

---

## **Risk Mitigation**

1. **Schema Changes**: Test migrations on staging first
2. **Breaking Changes**: Maintain backward compatibility where possible
3. **Performance**: Add indexes early, monitor query performance
4. **Security**: Review permission checks thoroughly
5. **Data Migration**: Plan for existing user data migration

---

## **Notes**

- All tasks should maintain existing OTP authentication
- Use existing code patterns and conventions
- Follow TypeScript best practices
- Use existing theme and UI components
- Maintain test coverage
- Document as you go

---

## **Phase 2 (Future) - Deferred Features**

The following features have been deferred to Phase 2:

### **Invitation Flow**

- User invitations with email tokens
- Approval workflow for role assignments
- Invitation acceptance flow
- Token-based invitation system

### **Catalog Management**

- Per-tenant product catalog
- Catalog CRUD operations
- Bulk catalog upload (CSV/Excel)
- Catalog upload processing and status tracking

These features will be implemented after the core multi-tenant RBAC system is complete and stable.
