import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Default configuration values
 */
const defaultConfigs = [
  // OTP Configuration
  { key: 'otp.length', value: '6', type: 'number' as const, category: 'otp', description: 'OTP code length (4-8 digits)' },
  { key: 'otp.expiry_seconds', value: '600', type: 'number' as const, category: 'otp', description: 'OTP expiry time in seconds' },
  { key: 'otp.max_attempts', value: '3', type: 'number' as const, category: 'otp', description: 'Maximum verification attempts per OTP' },
  { key: 'otp.hardcoded_enabled', value: 'false', type: 'boolean' as const, category: 'otp', description: 'Enable hardcoded OTP (uses last 4 digits of phone for testing)' },

  // Rate Limiting Configuration
  { key: 'rate_limit.otp_request_per_hour', value: '5', type: 'number' as const, category: 'rate_limit', description: 'OTP requests per hour per contact' },
  { key: 'rate_limit.ip_per_hour', value: '10', type: 'number' as const, category: 'rate_limit', description: 'Requests per hour per IP address' },
  { key: 'rate_limit.verify_per_10min', value: '3', type: 'number' as const, category: 'rate_limit', description: 'Verification attempts per 10 minutes' },
  { key: 'rate_limit.resend_seconds', value: '60', type: 'number' as const, category: 'rate_limit', description: 'Minimum seconds between resend requests' },

  // Contact Configuration
  { key: 'contact.default_country_code', value: '+1', type: 'string' as const, category: 'contact', description: 'Default country code for phone numbers' },
  { key: 'contact.email_enabled', value: 'true', type: 'boolean' as const, category: 'contact', description: 'Enable email authentication' },
  { key: 'contact.phone_enabled', value: 'true', type: 'boolean' as const, category: 'contact', description: 'Enable phone authentication' },

  // Security Configuration
  { key: 'security.session_ttl_seconds', value: '86400', type: 'number' as const, category: 'security', description: 'Session expiry time in seconds (24 hours)' },

  // Feature Flags
  { key: 'feature.registration_enabled', value: 'true', type: 'boolean' as const, category: 'feature', description: 'Enable user registration' },
  { key: 'feature.login_enabled', value: 'true', type: 'boolean' as const, category: 'feature', description: 'Enable user login' },
  { key: 'feature.sms_enabled', value: 'false', type: 'boolean' as const, category: 'feature', description: 'Enable SMS OTP delivery' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed default configurations
  console.log('📋 Seeding default configurations...');
  for (const config of defaultConfigs) {
    await prisma.configuration.upsert({
      where: { key: config.key },
      update: {
        // Only update if value changed (don't overwrite user changes)
        value: config.value,
        type: config.type,
        description: config.description,
        category: config.category,
      },
      create: {
        key: config.key,
        value: config.value,
        type: config.type,
        category: config.category,
        description: config.description,
        isActive: true,
      },
    });
    console.log(`  ✅ ${config.key}`);
  }

  console.log('\n🎉 Seeding completed!');
  console.log(`\n📊 Created ${defaultConfigs.length} default configurations`);
  console.log('\n💡 Configuration can be updated via database or ConfigService');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
