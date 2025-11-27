import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default configuration values
 */
const defaultConfigs = [
  // OTP Configuration
  {
    key: 'otp.length',
    value: '6',
    type: 'number' as const,
    category: 'otp',
    description: 'OTP code length (4-8 digits)',
  },
  {
    key: 'otp.expiry_seconds',
    value: '600',
    type: 'number' as const,
    category: 'otp',
    description: 'OTP expiry time in seconds',
  },
  {
    key: 'otp.max_attempts',
    value: '3',
    type: 'number' as const,
    category: 'otp',
    description: 'Maximum verification attempts per OTP',
  },
  {
    key: 'otp.hardcoded_enabled',
    value: 'false',
    type: 'boolean' as const,
    category: 'otp',
    description: 'Enable hardcoded OTP (uses last 4 digits of phone for testing)',
  },

  // Rate Limiting Configuration
  {
    key: 'rate_limit.otp_request_per_hour',
    value: '5',
    type: 'number' as const,
    category: 'rate_limit',
    description: 'OTP requests per hour per contact',
  },
  {
    key: 'rate_limit.ip_per_hour',
    value: '10',
    type: 'number' as const,
    category: 'rate_limit',
    description: 'Requests per hour per IP address',
  },
  {
    key: 'rate_limit.verify_per_10min',
    value: '3',
    type: 'number' as const,
    category: 'rate_limit',
    description: 'Verification attempts per 10 minutes',
  },
  {
    key: 'rate_limit.resend_seconds',
    value: '60',
    type: 'number' as const,
    category: 'rate_limit',
    description: 'Minimum seconds between resend requests',
  },
  {
    key: 'rate_limit.disable_rate_limit',
    value: 'true',
    type: 'boolean' as const,
    category: 'rate_limit',
    description: 'Disable all rate limiting checks',
  },

  // Contact Configuration
  {
    key: 'contact.default_country_code',
    value: '+1',
    type: 'string' as const,
    category: 'contact',
    description: 'Default country code for phone numbers',
  },
  {
    key: 'contact.email_enabled',
    value: 'true',
    type: 'boolean' as const,
    category: 'contact',
    description: 'Enable email authentication',
  },
  {
    key: 'contact.phone_enabled',
    value: 'true',
    type: 'boolean' as const,
    category: 'contact',
    description: 'Enable phone authentication',
  },

  // Security Configuration
  {
    key: 'security.session_ttl_seconds',
    value: '86400',
    type: 'number' as const,
    category: 'security',
    description: 'Session expiry time in seconds (24 hours)',
  },

  // Feature Flags
  {
    key: 'feature.registration_enabled',
    value: 'true',
    type: 'boolean' as const,
    category: 'feature',
    description: 'Enable user registration',
  },
  {
    key: 'feature.login_enabled',
    value: 'true',
    type: 'boolean' as const,
    category: 'feature',
    description: 'Enable user login',
  },
  {
    key: 'feature.sms_enabled',
    value: 'false',
    type: 'boolean' as const,
    category: 'feature',
    description: 'Enable SMS OTP delivery',
  },
];

/**
 * Default permissions for RBAC system
 */
const defaultPermissions = [
  // Tenant permissions
  {
    module: 'tenant',
    action: 'create',
    slug: 'tenant:create',
    description: 'Create new tenants',
  },
  {
    module: 'tenant',
    action: 'view',
    slug: 'tenant:view',
    description: 'View tenant details',
  },
  {
    module: 'tenant',
    action: 'edit',
    slug: 'tenant:edit',
    description: 'Edit tenant information',
  },
  {
    module: 'tenant',
    action: 'suspend',
    slug: 'tenant:suspend',
    description: 'Suspend or activate tenants',
  },

  // User permissions
  {
    module: 'user',
    action: 'view',
    slug: 'user:view',
    description: 'View user information',
  },
  {
    module: 'user',
    action: 'edit',
    slug: 'user:edit',
    description: 'Edit user information and assign roles',
  },
  {
    module: 'user',
    action: 'revoke',
    slug: 'user:revoke',
    description: 'Revoke roles from users',
  },

  // Role permissions
  {
    module: 'role',
    action: 'create',
    slug: 'role:create',
    description: 'Create new roles',
  },
  {
    module: 'role',
    action: 'view',
    slug: 'role:view',
    description: 'View role details',
  },
  {
    module: 'role',
    action: 'edit',
    slug: 'role:edit',
    description: 'Edit roles and assign permissions',
  },
  {
    module: 'role',
    action: 'delete',
    slug: 'role:delete',
    description: 'Delete roles',
  },

  // Permission permissions
  {
    module: 'permission',
    action: 'create',
    slug: 'permission:create',
    description: 'Create new permissions',
  },
  {
    module: 'permission',
    action: 'view',
    slug: 'permission:view',
    description: 'View permission details',
  },

  // Audit permissions
  {
    module: 'audit',
    action: 'view',
    slug: 'audit:view',
    description: 'View audit logs',
  },
];

/**
 * Default roles for RBAC system
 */
const defaultRoles = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    scope: 'global' as const,
    description: 'System-wide administrator with all permissions. Can manage tenants, roles, permissions, and users across the entire system.',
  },
  {
    slug: 'tenant_admin',
    name: 'Tenant Administrator',
    scope: 'tenant' as const,
    description: 'Tenant-level administrator. Can manage users and roles within their assigned tenant.',
  },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default configurations
  console.log('\n📋 Seeding default configurations...');
  for (const config of defaultConfigs) {
    const existing = await prisma.configuration.findUnique({
      where: { key: config.key },
    });

    if (existing) {
      // Only update description and type if they changed, preserve existing value
      if (existing.description !== config.description || existing.type !== config.type) {
        await prisma.configuration.update({
          where: { key: config.key },
          data: {
            description: config.description,
            type: config.type,
            category: config.category,
          },
        });
        console.log(`  🔄 ${config.key} (updated metadata only, value preserved)`);
      } else {
        console.log(`  ⏭️  ${config.key} (already exists, skipped)`);
      }
    } else {
      await prisma.configuration.create({
        data: {
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isActive: true,
        },
      });
      console.log(`  ✅ ${config.key} (created with default value)`);
    }
  }

  // Seed PolicyMeta
  console.log('\n📜 Seeding PolicyMeta...');
  const policyMeta = await prisma.policyMeta.upsert({
    where: { id: 'policy' },
    update: {},
    create: {
      id: 'policy',
      policyVer: 1,
    },
  });
  console.log(`  ✅ PolicyMeta initialized (version: ${policyMeta.policyVer})`);

  // Seed default permissions
  console.log('\n🔐 Seeding default permissions...');
  const permissionMap = new Map<string, string>(); // slug -> id

  for (const perm of defaultPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { slug: perm.slug },
    });

    if (existing) {
      permissionMap.set(perm.slug, existing.id);
      console.log(`  ⏭️  ${perm.slug} (already exists)`);
    } else {
      const created = await prisma.permission.create({
        data: {
          module: perm.module,
          action: perm.action,
          slug: perm.slug,
          description: perm.description,
        },
      });
      permissionMap.set(perm.slug, created.id);
      console.log(`  ✅ ${perm.slug} (created)`);
    }
  }

  // Seed default roles
  console.log('\n👥 Seeding default roles...');
  const roleMap = new Map<string, string>(); // slug -> id

  for (const role of defaultRoles) {
    const existing = await prisma.role.findUnique({
      where: { slug: role.slug },
    });

    if (existing) {
      roleMap.set(role.slug, existing.id);
      console.log(`  ⏭️  ${role.slug} (already exists)`);
    } else {
      const created = await prisma.role.create({
        data: {
          slug: role.slug,
          name: role.name,
          scope: role.scope,
          description: role.description,
        },
      });
      roleMap.set(role.slug, created.id);
      console.log(`  ✅ ${role.slug} (created)`);
    }
  }

  // Assign permissions to roles
  console.log('\n🔗 Assigning permissions to roles...');

  // Super Admin: All permissions
  const superAdminRoleId = roleMap.get('super_admin');
  if (superAdminRoleId) {
    const allPermissionIds = Array.from(permissionMap.values());
    const existingRolePerms = await prisma.rolePermission.findMany({
      where: { roleId: superAdminRoleId },
    });
    const existingPermissionIds = new Set(existingRolePerms.map((rp) => rp.permissionId));

    const permissionsToAdd = allPermissionIds.filter((id) => !existingPermissionIds.has(id));
    if (permissionsToAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToAdd.map((permissionId) => ({
          roleId: superAdminRoleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ super_admin: Assigned ${permissionsToAdd.length} permissions (total: ${allPermissionIds.length})`);
    } else {
      console.log(`  ⏭️  super_admin: All permissions already assigned`);
    }
  }

  // Tenant Admin: Tenant-level permissions only
  const tenantAdminRoleId = roleMap.get('tenant_admin');
  if (tenantAdminRoleId) {
    const tenantAdminPermissions = [
      'user:view',
      'user:edit',
      'user:revoke',
    ];

    const tenantAdminPermissionIds = tenantAdminPermissions
      .map((slug) => permissionMap.get(slug))
      .filter((id): id is string => id !== undefined);

    const existingRolePerms = await prisma.rolePermission.findMany({
      where: { roleId: tenantAdminRoleId },
    });
    const existingPermissionIds = new Set(existingRolePerms.map((rp) => rp.permissionId));

    const permissionsToAdd = tenantAdminPermissionIds.filter((id) => !existingPermissionIds.has(id));
    if (permissionsToAdd.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionsToAdd.map((permissionId) => ({
          roleId: tenantAdminRoleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
      console.log(`  ✅ tenant_admin: Assigned ${permissionsToAdd.length} permissions`);
    } else {
      console.log(`  ⏭️  tenant_admin: All permissions already assigned`);
    }
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${defaultConfigs.length} configurations`);
  console.log(`   - ${defaultPermissions.length} permissions`);
  console.log(`   - ${defaultRoles.length} roles`);
  console.log(`   - PolicyMeta initialized`);
  console.log('\n💡 Note: Super admin user must be created manually or via registration');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    console.error('Stack:', e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
