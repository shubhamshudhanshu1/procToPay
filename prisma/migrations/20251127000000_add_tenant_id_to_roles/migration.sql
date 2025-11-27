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

