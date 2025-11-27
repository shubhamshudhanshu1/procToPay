import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to assign super_admin role to a user
 *
 * Usage: npx ts-node scripts/assign-super-admin.ts <user-email>
 */

async function assignSuperAdmin(userEmail: string) {
  try {
    console.log(`🔍 Looking for user with email: ${userEmail}`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.error(`❌ User with email "${userEmail}" not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.firstName || ''} ${user.lastName || ''} (${user.email})`);

    // Find super_admin role
    const superAdminRole = await prisma.role.findUnique({
      where: { slug: 'super_admin' },
    });

    if (!superAdminRole) {
      console.error('❌ super_admin role not found. Please run seed script first.');
      process.exit(1);
    }

    console.log(`✅ Found super_admin role`);

    // Check if user already has super_admin role
    const existingUserRole = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: superAdminRole.id,
        tenantId: null, // Global role
        status: 'active',
      },
    });

    if (existingUserRole) {
      console.log(`✅ User already has super_admin role assigned`);
      return;
    }

    // Assign super_admin role (global scope, so tenantId is null)
    const userRole = await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: superAdminRole.id,
        tenantId: null, // Global role
        status: 'active',
      },
    });

    console.log(`\n🎉 Successfully assigned super_admin role to user!`);
    console.log(`\n📋 Details:`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: super_admin (global scope)`);
    console.log(`   UserRole ID: ${userRole.id}`);
    console.log(`\n💡 The user can now access global administration features.`);
  } catch (error) {
    console.error('❌ Error assigning super_admin role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide user email as argument');
  console.error('Usage: npx ts-node scripts/assign-super-admin.ts <user-email>');
  process.exit(1);
}

assignSuperAdmin(userEmail);

// docker-compose -f docker-compose.dev.yml exec app npx ts-node scripts/assign-super-admin.ts danish.shard@ril.com
