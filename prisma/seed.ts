import { PrismaClient } from '@prisma/client';
import { generateToken, hashOTP } from '../src/lib/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      emailVerifiedAt: new Date(),
      createdVia: 'email_passwordless',
    },
  });

  console.log('✅ Created test user:', user.email);

  // Create a test OTP token
  const otp = '123456';
  const hashedOTP = hashOTP(user.email, otp);

  const token = await prisma.loginToken.create({
    data: {
      email: user.email,
      token: hashedOTP,
      kind: 'otp',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  console.log('✅ Created test OTP token');
  console.log('📧 Test OTP:', otp);
  console.log('🔗 Test with: POST /auth/verify');
  console.log('   Body: { "email": "test@example.com", "otp": "123456" }');

  // Create a test magic link token
  const magicToken = generateToken(32);

  const magicLinkToken = await prisma.loginToken.create({
    data: {
      email: user.email,
      token: magicToken,
      kind: 'magic',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    },
  });

  console.log('✅ Created test magic link token');
  console.log('🔗 Test magic link: GET /auth/verify?token=' + magicToken);

  console.log('\n🎉 Seeding completed!');
  console.log('\n📋 Test endpoints:');
  console.log('   Health: GET /health');
  console.log('   CSRF: GET /csrf');
  console.log('   Request OTP: POST /auth/request');
  console.log('   Verify OTP: POST /auth/verify');
  console.log('   Magic Link: GET /auth/verify?token=...');
  console.log('   User Info: GET /me');
  console.log('   Sessions: GET /me/sessions');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
