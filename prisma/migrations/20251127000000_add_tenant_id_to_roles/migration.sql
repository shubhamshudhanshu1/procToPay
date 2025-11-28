-- AlterTable: Add tenantId to roles table and remove scope column
-- This allows tenant-specific roles to avoid slug conflicts across tenants
-- Scope is now derived from tenantId: null = global, set = tenant

-- Step 1: Drop any existing triggers that reference scope
DROP TRIGGER IF EXISTS trigger_validate_role_scope_tenant ON roles;
DROP FUNCTION IF EXISTS validate_role_scope_tenant();

-- Step 2: Add tenantId column FIRST (nullable, will be null for existing global roles)
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "tenantId" UUID;

-- Step 3: Migrate data: Set tenantId based on existing scope
-- All existing roles with scope='global' should have tenantId=NULL
-- All existing roles with scope='tenant' should remain NULL for now (they need tenant assignment)
UPDATE "roles" SET "tenantId" = NULL WHERE "scope" = 'global';

-- Step 4: Make tenantId NOT NULL temporarily to allow foreign key, but actually we'll keep it nullable
-- (Actually, we want it nullable, so skip this)

-- Step 5: Add foreign key constraint (only after tenantId column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_tenantId_fkey'
  ) THEN
    ALTER TABLE "roles" ADD CONSTRAINT "roles_tenantId_fkey" 
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 6: Drop the old unique constraint/index on slug (we'll create a composite one)
-- The old constraint was created as a UNIQUE INDEX, so drop it as an index
DROP INDEX IF EXISTS "roles_slug_key";

-- Step 7: Drop the index on scope
DROP INDEX IF EXISTS "roles_scope_idx";

-- Step 8: Now we can safely drop the scope column (data already migrated)
ALTER TABLE "roles" DROP COLUMN IF EXISTS "scope";

-- Step 9: Create composite unique constraint (slug, tenantId)
-- This allows same slug across different tenants, but unique per tenant
-- NULL tenantId means global role, so slug must be unique globally when tenantId is NULL
CREATE UNIQUE INDEX IF NOT EXISTS "roles_slug_tenantId_key" ON "roles"("slug", "tenantId");

-- Step 10: Add index on tenantId for performance
CREATE INDEX IF NOT EXISTS "roles_tenantId_idx" ON "roles"("tenantId");

-- Step 11: Fix UserRole Scope Enforcement Trigger
-- The trigger was referencing the removed 'scope' column
-- Update to use tenantId from roles table instead (null = global, set = tenant)
DROP TRIGGER IF EXISTS trigger_validate_user_role_scope ON user_roles;
DROP FUNCTION IF EXISTS validate_user_role_scope();

-- Recreate the function using tenantId instead of scope
CREATE OR REPLACE FUNCTION validate_user_role_scope()
RETURNS TRIGGER AS $$
DECLARE
  role_tenant_id UUID;
BEGIN
  -- Get role's tenantId (null = global role, UUID = tenant role)
  SELECT "tenantId" INTO role_tenant_id
  FROM roles
  WHERE id = NEW."roleId";

  -- If role not found, allow it (will be caught by foreign key constraint)
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Global role (tenantId IS NULL) cannot have tenantId in UserRole
  IF role_tenant_id IS NULL AND NEW."tenantId" IS NOT NULL THEN
    RAISE EXCEPTION 'Global roles cannot be assigned to a tenant. Role % is global but tenantId is provided.', NEW."roleId";
  END IF;

  -- Tenant role (tenantId IS NOT NULL) must have matching tenantId in UserRole
  IF role_tenant_id IS NOT NULL AND NEW."tenantId" IS NULL THEN
    RAISE EXCEPTION 'Tenant roles must be assigned to a tenant. Role % is tenant-scoped but tenantId is NULL.', NEW."roleId";
  END IF;

  -- Tenant role's tenantId must match UserRole's tenantId
  IF role_tenant_id IS NOT NULL AND NEW."tenantId" IS NOT NULL AND role_tenant_id != NEW."tenantId" THEN
    RAISE EXCEPTION 'Tenant role tenantId mismatch. Role belongs to tenant % but assignment has tenantId %.', role_tenant_id, NEW."tenantId";
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_validate_user_role_scope
  BEFORE INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_role_scope();

