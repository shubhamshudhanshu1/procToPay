import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

describe('Authentication', () => {
  beforeEach(async () => {
    await prisma.loginToken.deleteMany();
    await prisma.user.deleteMany();
    await redis.flushall();
  });

  describe('POST /auth/request', () => {
    it('should request OTP for valid email', async () => {
      await request(app).post('/auth/request').send({ email: 'test@example.com' }).expect(204);

      // Check that a login token was created
      const token = await prisma.loginToken.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(token).toBeTruthy();
      expect(token?.kind).toBe('otp');
    });

    it('should request magic link for valid email', async () => {
      // Set AUTH_MODE to magic
      process.env['AUTH_MODE'] = 'magic';

      await request(app).post('/auth/request').send({ email: 'test@example.com' }).expect(204);

      // Check that a login token was created
      const token = await prisma.loginToken.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(token).toBeTruthy();
      expect(token?.kind).toBe('magic');
    });

    it('should normalize email addresses', async () => {
      await request(app).post('/auth/request').send({ email: '  TEST@EXAMPLE.COM  ' }).expect(204);

      const token = await prisma.loginToken.findFirst({
        where: { email: 'test@example.com' },
      });
      expect(token).toBeTruthy();
    });

    it('should return 204 for invalid email (no user enumeration)', async () => {
      await request(app).post('/auth/request').send({ email: 'invalid-email' }).expect(204);
    });

    it('should respect rate limits', async () => {
      // Make 6 requests (limit is 5)
      for (let i = 0; i < 6; i++) {
        const response = await request(app)
          .post('/auth/request')
          .send({ email: 'test@example.com' });

        if (i < 5) {
          expect(response.status).toBe(204);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });

  describe('POST /auth/verify (OTP mode)', () => {
    beforeEach(() => {
      process.env['AUTH_MODE'] = 'otp';
    });

    it('should verify valid OTP and create user', async () => {
      // First request OTP
      await request(app).post('/auth/request').send({ email: 'test@example.com' }).expect(204);

      // Get the OTP from database (in real scenario, user would get it via email)
      const token = await prisma.loginToken.findFirst({
        where: { email: 'test@example.com', kind: 'otp' },
      });
      expect(token).toBeTruthy();

      // For testing, we need to get the actual OTP value
      // In production, this would be sent via email
      // const otp = '123456'; // This would be the actual OTP sent to user

      // Create a token with known OTP for testing
      await prisma.loginToken.create({
        data: {
          email: 'test@example.com',
          token: 'hashed_otp_123456', // This would be the hashed OTP
          kind: 'otp',
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      await request(app).post('/auth/verify').send({ email: 'test@example.com', otp: '123456' });

      // Check that user was created
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user?.emailVerifiedAt).toBeTruthy();
    });

    it('should reject invalid OTP', async () => {
      await request(app)
        .post('/auth/verify')
        .send({ email: 'test@example.com', otp: 'invalid' })
        .expect(400);
    });

    it('should reject expired OTP', async () => {
      // Create expired token
      await prisma.loginToken.create({
        data: {
          email: 'test@example.com',
          token: 'hashed_otp',
          kind: 'otp',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      await request(app)
        .post('/auth/verify')
        .send({ email: 'test@example.com', otp: '123456' })
        .expect(400);
    });

    it('should mark token as used after verification', async () => {
      const token = await prisma.loginToken.create({
        data: {
          email: 'test@example.com',
          token: 'hashed_otp',
          kind: 'otp',
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      await request(app).post('/auth/verify').send({ email: 'test@example.com', otp: '123456' });

      const updatedToken = await prisma.loginToken.findUnique({
        where: { id: token.id },
      });
      expect(updatedToken?.usedAt).toBeTruthy();
    });
  });

  describe('GET /auth/verify (Magic link mode)', () => {
    beforeEach(() => {
      process.env['AUTH_MODE'] = 'magic';
    });

    it('should verify valid magic link and create user', async () => {
      const token = await prisma.loginToken.create({
        data: {
          email: 'test@example.com',
          token: 'magic_token_123',
          kind: 'magic',
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      await request(app).get(`/auth/verify?token=${token.token}`).expect(302); // Should redirect to app

      // Check that user was created
      const user = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      expect(user).toBeTruthy();
      expect(user?.emailVerifiedAt).toBeTruthy();
    });

    it('should reject invalid magic link', async () => {
      await request(app).get('/auth/verify?token=invalid_token').expect(400);
    });

    it('should reject expired magic link', async () => {
      await prisma.loginToken.create({
        data: {
          email: 'test@example.com',
          token: 'expired_token',
          kind: 'magic',
          expiresAt: new Date(Date.now() - 1000), // Expired
        },
      });

      await request(app).get('/auth/verify?token=expired_token').expect(400);
    });
  });
});
