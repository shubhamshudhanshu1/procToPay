import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimiterService } from '../services/rateLimiterService';
import { configService } from '../services/configService';
import { contactService } from '../services/contactService';
import { redis } from '../lib/redis';

// Mock config service
vi.mock('../services/configService', () => ({
  configService: {
    getRateLimitConfig: vi.fn().mockResolvedValue({
      otpRequestPerHour: 5,
      ipPerHour: 10,
      verifyPer10Min: 3,
      resendSeconds: 60,
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

describe('RateLimiterService', () => {
  beforeEach(async () => {
    // Clean up rate limit keys
    const keys = await redis.keys('rate_limit:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  });

  describe('checkOTPRequestLimit', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should reject requests over limit', async () => {
      // Make 5 requests (limit)
      for (let i = 0; i < 5; i++) {
        await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
      }
      
      // 6th request should be rejected
      const result = await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
    });

    it('should track requests per contact separately', async () => {
      // Use up limit for first contact
      for (let i = 0; i < 5; i++) {
        await rateLimiterService.checkOTPRequestLimit('user1@example.com', 'email');
      }
      
      // Second contact should still have limit available
      const result = await rateLimiterService.checkOTPRequestLimit('user2@example.com', 'email');
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkIPLimit', () => {
    it('should allow requests within IP limit', async () => {
      for (let i = 0; i < 10; i++) {
        const result = await rateLimiterService.checkIPLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject requests over IP limit', async () => {
      // Make 10 requests (limit)
      for (let i = 0; i < 10; i++) {
        await rateLimiterService.checkIPLimit('192.168.1.1');
      }
      
      // 11th request should be rejected
      const result = await rateLimiterService.checkIPLimit('192.168.1.1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkVerifyLimit', () => {
    it('should allow verification attempts within limit', async () => {
      for (let i = 0; i < 3; i++) {
        const result = await rateLimiterService.checkVerifyLimit('test@example.com', 'email');
        expect(result.allowed).toBe(true);
      }
    });

    it('should reject verification attempts over limit', async () => {
      // Make 3 attempts (limit)
      for (let i = 0; i < 3; i++) {
        await rateLimiterService.checkVerifyLimit('test@example.com', 'email');
      }
      
      // 4th attempt should be rejected
      const result = await rateLimiterService.checkVerifyLimit('test@example.com', 'email');
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkResendTimer', () => {
    it('should allow first resend request', async () => {
      const result = await rateLimiterService.checkResendTimer('test@example.com', 'email');
      expect(result.allowed).toBe(true);
    });

    it('should reject resend request too soon', async () => {
      // First request
      await rateLimiterService.checkResendTimer('test@example.com', 'email');
      
      // Immediate second request should be rejected
      const result = await rateLimiterService.checkResendTimer('test@example.com', 'email');
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    it('should allow resend after timer expires', async () => {
      // Mock time to advance
      vi.useFakeTimers();
      
      // First request
      await rateLimiterService.checkResendTimer('test@example.com', 'email');
      
      // Advance time by 61 seconds
      vi.advanceTimersByTime(61000);
      
      // Second request should be allowed
      const result = await rateLimiterService.checkResendTimer('test@example.com', 'email');
      expect(result.allowed).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('reset', () => {
    it('should reset rate limit', async () => {
      // Use up limit
      for (let i = 0; i < 5; i++) {
        await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
      }
      
      // Reset
      await rateLimiterService.resetOTPRequestLimit('test@example.com', 'email');
      
      // Should be able to make requests again
      const result = await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
      expect(result.allowed).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('should return rate limit status', async () => {
      await rateLimiterService.checkOTPRequestLimit('test@example.com', 'email');
      
      const status = await rateLimiterService.getStatus('otp_request:email:test@example.com');
      
      expect(status).toBeTruthy();
      expect(status?.count).toBeGreaterThan(0);
      expect(status?.ttl).toBeGreaterThan(0);
    });
  });
});

