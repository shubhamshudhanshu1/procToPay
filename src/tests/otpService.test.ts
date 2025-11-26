import { describe, it, expect, beforeEach, vi } from 'vitest';
import { otpService } from '../services/otpService';
import { contactService } from '../services/contactService';
import { configService } from '../services/configService';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

// Mock config service
vi.mock('../services/configService', () => ({
  configService: {
    getOTPConfig: vi.fn().mockResolvedValue({
      length: 6,
      expirySeconds: 600,
      maxAttempts: 3,
      hardcodedEnabled: false,
    }),
  },
}));

// Mock contact service
vi.mock('../services/contactService', () => ({
  contactService: {
    normalizeEmail: (email: string) => email.toLowerCase().trim(),
    normalizePhone: async (phone: string) => {
      const cleaned = phone.replace(/\D/g, '');
      return cleaned.length === 10 ? `+1${cleaned}` : `+${cleaned}`;
    },
  },
}));

describe('OTPService', () => {
  beforeEach(async () => {
    // Clean up before each test
    await prisma.otpToken.deleteMany();
    const keys = await redis.keys('otp:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('generateOTP', () => {
    it('should generate OTP for email', async () => {
      const otp = await otpService.generateOTP('test@example.com', 'email');
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate OTP for phone', async () => {
      const otp = await otpService.generateOTP('+11234567890', 'phone');
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate hardcoded OTP for phone when enabled', async () => {
      vi.mocked(configService.getOTPConfig).mockResolvedValueOnce({
        length: 6,
        expirySeconds: 600,
        maxAttempts: 3,
        hardcodedEnabled: true,
      });

      const otp = await otpService.generateOTP('+11234567890', 'phone');
      expect(otp).toBe('7890'); // Last 4 digits
    });

    it('should store OTP in database', async () => {
      await otpService.generateOTP('test@example.com', 'email', '192.168.1.1', 'test-agent');
      
      const token = await prisma.otpToken.findFirst({
        where: { contact: 'test@example.com', contactType: 'email' },
      });
      
      expect(token).toBeTruthy();
      expect(token?.status).toBe('pending');
      expect(token?.maxAttempts).toBe(3);
    });

    it('should store OTP in Redis', async () => {
      const otp = await otpService.generateOTP('test@example.com', 'email');
      
      const contactKey = 'otp:contact:email:test@example.com';
      const tokenId = await redis.get(contactKey);
      expect(tokenId).toBeTruthy();
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP', async () => {
      const otp = await otpService.generateOTP('test@example.com', 'email');
      const result = await otpService.verifyOTP('test@example.com', 'email', otp);
      
      expect(result.valid).toBe(true);
      expect(result.attemptsRemaining).toBeDefined();
    });

    it('should reject incorrect OTP', async () => {
      await otpService.generateOTP('test@example.com', 'email');
      const result = await otpService.verifyOTP('test@example.com', 'email', '000000');
      
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid');
      expect(result.attemptsRemaining).toBe(2); // 3 max - 1 attempt
    });

    it('should track attempts', async () => {
      await otpService.generateOTP('test@example.com', 'email');
      
      // First wrong attempt
      await otpService.verifyOTP('test@example.com', 'email', '000000');
      const token1 = await prisma.otpToken.findFirst({
        where: { contact: 'test@example.com' },
      });
      expect(token1?.attempts).toBe(1);
      
      // Second wrong attempt
      await otpService.verifyOTP('test@example.com', 'email', '000000');
      const token2 = await prisma.otpToken.findFirst({
        where: { contact: 'test@example.com' },
      });
      expect(token2?.attempts).toBe(2);
    });

    it('should reject after max attempts', async () => {
      await otpService.generateOTP('test@example.com', 'email');
      
      // Make 3 wrong attempts
      for (let i = 0; i < 3; i++) {
        await otpService.verifyOTP('test@example.com', 'email', '000000');
      }
      
      // Fourth attempt should fail
      const result = await otpService.verifyOTP('test@example.com', 'email', '000000');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('max_attempts');
      
      const token = await prisma.otpToken.findFirst({
        where: { contact: 'test@example.com' },
      });
      expect(token?.status).toBe('failed');
    });

    it('should reject expired OTP', async () => {
      // Create expired token manually
      const expiredTime = new Date(Date.now() - 1000);
      await prisma.otpToken.create({
        data: {
          contact: 'test@example.com',
          contactType: 'email',
          tokenHash: 'expired_hash',
          expiresAt: expiredTime,
          status: 'pending',
          maxAttempts: 3,
        },
      });
      
      const result = await otpService.verifyOTP('test@example.com', 'email', '123456');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired');
    });
  });

  describe('invalidateOTP', () => {
    it('should invalidate pending OTPs', async () => {
      await otpService.generateOTP('test@example.com', 'email');
      
      await otpService.invalidateOTP('test@example.com', 'email', 'test_reason');
      
      const token = await prisma.otpToken.findFirst({
        where: { contact: 'test@example.com' },
      });
      expect(token?.status).toBe('expired');
      expect(token?.failedReason).toBe('test_reason');
    });
  });

  describe('getOTPStatus', () => {
    it('should return OTP status', async () => {
      await otpService.generateOTP('test@example.com', 'email');
      
      const status = await otpService.getOTPStatus('test@example.com', 'email');
      
      expect(status).toBeTruthy();
      expect(status?.contact).toBe('test@example.com');
      expect(status?.contactType).toBe('email');
      expect(status?.status).toBe('pending');
    });

    it('should return null if no pending OTP', async () => {
      const status = await otpService.getOTPStatus('test@example.com', 'email');
      expect(status).toBeNull();
    });
  });
});

