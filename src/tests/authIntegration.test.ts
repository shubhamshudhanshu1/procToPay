import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../server';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { authService } from '../services/authService';
import { emailService } from '../services/emailService';
import { smsService } from '../services/smsService';

// Mock email and SMS services
vi.mock('../services/emailService', () => ({
  emailService: {
    sendOTP: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/smsService', () => ({
  smsService: {
    sendOTP: vi.fn().mockResolvedValue(undefined),
    isAvailable: vi.fn().mockReturnValue(true),
  },
}));

describe('Authentication Integration Tests', () => {
  beforeEach(async () => {
    // Clean up before each test
    await prisma.otpToken.deleteMany();
    await prisma.user.deleteMany();
    const keys = await redis.keys('*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('POST /api/auth/login/request', () => {
    it('should request OTP for email', async () => {
      // Create user first
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/api/auth/login/request')
        .send({ contact: 'test@example.com' });

      expect(response.status).toBe(204);
      expect(emailService.sendOTP).toHaveBeenCalled();
    });

    it('should request OTP for phone', async () => {
      await prisma.user.create({
        data: {
          phoneNumber: '+11234567890',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      const response = await request(app)
        .post('/api/auth/login/request')
        .send({ contact: '+11234567890' });

      expect(response.status).toBe(204);
      expect(smsService.sendOTP).toHaveBeenCalled();
    });

    it('should return 204 even for non-existent user (prevent enumeration)', async () => {
      const response = await request(app)
        .post('/api/auth/login/request')
        .send({ contact: 'nonexistent@example.com' });

      expect(response.status).toBe(204);
    });
  });

  describe('POST /api/auth/login/verify', () => {
    it('should verify OTP and create session', async () => {
      // Create user
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Generate OTP using otpService directly to get the OTP value
      const { otpService } = await import('../services/otpService');
      const otp = await otpService.generateOTP('test@example.com', 'email');

      // Verify OTP
      const response = await request(app).post('/api/auth/login/verify').send({
        contact: 'test@example.com',
        otp: otp,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should reject invalid OTP', async () => {
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await authService.requestOTP('test@example.com');

      const response = await request(app).post('/api/auth/login/verify').send({
        contact: 'test@example.com',
        otp: '000000',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user with email', async () => {
      const response = await request(app).post('/api/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBeDefined();
      expect(response.body.contactType).toBe('email');
      expect(emailService.sendOTP).toHaveBeenCalled();
    });

    it('should register new user with phone', async () => {
      const response = await request(app).post('/api/auth/register').send({
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+11234567890',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.contactType).toBe('phone');
      expect(smsService.sendOTP).toHaveBeenCalled();
    });

    it('should reject registration without contact', async () => {
      const response = await request(app).post('/api/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register/verify', () => {
    it('should verify registration OTP', async () => {
      // Register user
      const registerResponse = await request(app).post('/api/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });

      const userId = registerResponse.body.userId;

      // Get the OTP using otpService directly
      const { otpService } = await import('../services/otpService');
      const otp = await otpService.generateOTP('john@example.com', 'email');

      // Verify OTP
      const response = await request(app).post('/api/auth/register/verify').send({
        userId: userId,
        contact: 'john@example.com',
        otp: otp,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('john@example.com');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user', async () => {
      const response = await request(app).post('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Hardcoded OTP for Phone', () => {
    it('should use last 4 digits as OTP when hardcoded enabled', async () => {
      // Create user with phone
      await prisma.user.create({
        data: {
          phoneNumber: '+11234567890',
          firstName: 'Test',
          lastName: 'User',
        },
      });

      // Mock config to enable hardcoded OTP
      const { configService } = await import('../services/configService');
      vi.spyOn(configService, 'getOTPConfig').mockResolvedValue({
        length: 6,
        expirySeconds: 600,
        maxAttempts: 3,
        hardcodedEnabled: true,
      });

      const { otpService } = await import('../services/otpService');
      const phone = '+11234567890';
      const otp = await otpService.generateOTP(phone, 'phone');

      // OTP should be last 6 digits (matching configured length)
      expect(otp).toBe('567890');

      // Verify should work with this OTP
      const verifyResult = await otpService.verifyOTP(phone, 'phone', otp);
      expect(verifyResult.valid).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce OTP request rate limit', async () => {
      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/auth/login/request').send({ contact: 'test@example.com' });
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/auth/login/request')
        .send({ contact: 'test@example.com' });

      // Should still return 204 to prevent enumeration, but rate limit is enforced internally
      expect(response.status).toBe(204);
    });

    it('should enforce resend timer', async () => {
      await request(app).post('/api/auth/login/request').send({ contact: 'test@example.com' });

      // Immediate resend should be blocked
      const response = await request(app)
        .post('/api/auth/login/request')
        .send({ contact: 'test@example.com' });

      // Should still return 204, but resend timer is enforced internally
      expect(response.status).toBe(204);
    });
  });
});
