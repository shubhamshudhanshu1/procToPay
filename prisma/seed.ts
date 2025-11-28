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
    value: 'true',
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

  // Universal permission (grants all permissions)
  {
    module: '*',
    action: '*',
    slug: '*',
    description: 'Universal permission that grants access to all system operations',
  },
];

/**
 * Default roles for RBAC system
 *
 * Note: tenant_admin is not created here because it requires a tenantId.
 * It should be created per tenant when tenants are created.
 */
const defaultRoles = [
  {
    slug: 'super_admin',
    name: 'Super Administrator',
    tenantId: null as string | null, // Global roles have tenantId=null
    description:
      'System-wide administrator with all permissions. Can manage tenants, roles, permissions, and users across the entire system.',
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
    // Use findFirst for composite unique key with nullable tenantId
    // Prisma's findUnique doesn't handle nullable fields in composite keys well
    const existing = await prisma.role.findFirst({
      where: {
        slug: role.slug,
        tenantId: role.tenantId,
      },
    });

    if (existing) {
      roleMap.set(role.slug, existing.id);
      console.log(`  ⏭️  ${role.slug} (already exists)`);
    } else {
      const created = await prisma.role.create({
        data: {
          slug: role.slug,
          name: role.name,
          tenantId: role.tenantId,
          description: role.description,
        },
      });
      roleMap.set(role.slug, created.id);
      console.log(`  ✅ ${role.slug} (created)`);
    }
  }

  // Get role IDs for reuse in multiple sections
  const superAdminRoleId = roleMap.get('super_admin');

  // Note: tenant_admin is not created in seed - it should be created per tenant
  // when tenants are created, as it requires a tenantId

  // Assign permissions to roles
  console.log('\n🔗 Assigning permissions to roles...');

  // Super Admin: Assign '*' permission (grants all permissions)
  if (superAdminRoleId) {
    const universalPermissionId = permissionMap.get('*');

    if (!universalPermissionId) {
      console.error('  ❌ Universal permission (*) not found!');
    } else {
      const existingRolePerms = await prisma.rolePermission.findMany({
        where: { roleId: superAdminRoleId },
      });
      const existingPermissionIds = new Set(existingRolePerms.map((rp) => rp.permissionId));

      if (!existingPermissionIds.has(universalPermissionId)) {
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRoleId,
            permissionId: universalPermissionId,
          },
        });
        console.log(`  ✅ super_admin: Assigned universal permission (*)`);
      } else {
        console.log(`  ⏭️  super_admin: Universal permission (*) already assigned`);
      }

      // Remove any other permissions from super_admin (only '*' is needed)
      const otherPermissionIds = existingRolePerms
        .filter((rp) => rp.permissionId !== universalPermissionId)
        .map((rp) => rp.permissionId);

      if (otherPermissionIds.length > 0) {
        await prisma.rolePermission.deleteMany({
          where: {
            roleId: superAdminRoleId,
            permissionId: { in: otherPermissionIds },
          },
        });
        console.log(
          `  🧹 super_admin: Removed ${otherPermissionIds.length} redundant permissions (only '*' is needed)`
        );
      }
    }
  }

  // Note: tenant_admin role is not created in seed because it requires a tenantId.
  // It should be created per tenant when tenants are created.
  // For now, we skip tenant_admin permission assignment in seed.

  // If you need to create tenant_admin for a specific tenant, do it like this:
  // const tenantAdminRole = await prisma.role.create({
  //   data: {
  //     slug: 'tenant_admin',
  //     name: 'Tenant Administrator',
  //     tenantId: <tenantId>,
  //     description: 'Tenant-level administrator',
  //   },
  // });

  // Seed super admin user
  console.log('\n👑 Creating super admin user...');
  // Phone number must be in normalized E.164 format to match auth service normalization
  // 10-digit number will be normalized to +19999999999 (default country code +1)
  const superAdminPhone = '+19999999999';
  const superAdminEmail = 'admin@ril.com';
  if (superAdminRoleId) {
    // Check if user already exists (try both formats for migration compatibility)
    let superAdminUser = await prisma.user.findUnique({
      where: { phoneNumber: superAdminPhone },
    });

    // Also check old format for migration (in case user was created with old format)
    if (!superAdminUser) {
      const oldFormatUser = await prisma.user.findUnique({
        where: { phoneNumber: '9999999999' },
      });
      // If found with old format, update to new format
      if (oldFormatUser) {
        // Check if normalized format already exists (edge case)
        const normalizedExists = await prisma.user.findUnique({
          where: { phoneNumber: superAdminPhone },
        });
        if (normalizedExists && normalizedExists.id !== oldFormatUser.id) {
          // Normalized format exists with different ID - delete old one
          await prisma.user.delete({ where: { id: oldFormatUser.id } });
          superAdminUser = normalizedExists;
          console.log(`  🔄 Removed duplicate user with old phone format`);
        } else {
          // Update to normalized format
          superAdminUser = await prisma.user.update({
            where: { id: oldFormatUser.id },
            data: { phoneNumber: superAdminPhone },
          });
          console.log(`  🔄 Updated phone number format for existing user`);
        }
      }
    }

    if (!superAdminUser) {
      // Create super admin user
      superAdminUser = await prisma.user.create({
        data: {
          phoneNumber: superAdminPhone,
          email: superAdminEmail,
          firstName: 'Super',
          lastName: 'Admin',
          status: 'active',
          phoneVerifiedAt: new Date(), // Mark phone as verified for seed user
        },
      });
      console.log(`  ✅ Super admin user created (phone: ${superAdminPhone})`);
    } else {
      console.log(`  ⏭️  Super admin user already exists (phone: ${superAdminPhone})`);
    }

    // Check if super admin role is already assigned
    const existingSuperAdminRole = await prisma.userRole.findFirst({
      where: {
        userId: superAdminUser.id,
        roleId: superAdminRoleId,
        tenantId: null, // Global role
        status: 'active',
      },
    });

    if (!existingSuperAdminRole) {
      // Assign super admin role
      await prisma.userRole.create({
        data: {
          userId: superAdminUser.id,
          roleId: superAdminRoleId,
          tenantId: null, // Global role, no tenant
          status: 'active',
        },
      });
      console.log(`  ✅ Super admin role assigned`);
    } else {
      console.log(`  ⏭️  Super admin role already assigned`);
    }
  } else {
    console.log(`  ⚠️  Super admin role not found, skipping user creation`);
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`\n📊 Summary:`);
  console.log(`   - ${defaultConfigs.length} configurations`);
  console.log(`   - ${defaultPermissions.length} permissions`);
  console.log(`   - ${defaultRoles.length} roles`);
  console.log(`   - PolicyMeta initialized`);
  console.log(`   - Super admin user (phone: ${superAdminPhone})`);
  console.log('\n💡 You can login with phone number: 9999999999 (or +19999999999)');
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
