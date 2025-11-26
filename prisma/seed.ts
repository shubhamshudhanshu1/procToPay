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

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default configurations
  console.log('📋 Seeding default configurations...');
  for (const config of defaultConfigs) {
    const existing = await prisma.configuration.findUnique({
      where: { key: config.key },
    });

    if (existing) {
      // Only update description and type if they changed, preserve existing value
      // This prevents overwriting production/UAT configurations
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
      // Create new configuration with default value
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

  console.log('\n🎉 Seeding completed!');
  console.log(`\n📊 Created ${defaultConfigs.length} default configurations`);
  console.log('\n💡 Configuration can be updated via database or ConfigService');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    console.error('Stack:', e.stack);
    // Exit with error code so entrypoint knows it failed
    // Entrypoint will handle gracefully
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
