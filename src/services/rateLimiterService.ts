import { randomUUID } from 'crypto';
import { redis } from '../lib/redis';
import { configService } from './configService';
import { contactService } from './contactService';

/**
 * Rate Limiter Service
 *
 * Implements sliding window rate limiting using Redis sorted sets.
 * Provides rate limiting for OTP requests, IP addresses, and resend timers.
 */
class RateLimiterService {
  private readonly redisPrefix = 'rate_limit:';

  /**
   * Check rate limit using sliding window algorithm
   *
   * @param key Redis key for the rate limit
   * @param maxRequests Maximum requests allowed in the window
   * @param windowSeconds Time window in seconds
   * @returns Rate limit result
   */
  private async checkRateLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKey = `${this.redisPrefix}${key}`;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove expired entries (older than windowStart)
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);

    // Count current entries in the window
    pipeline.zcard(redisKey);

    // Add current request with UUID for unique identification
    const requestId = `${now}-${randomUUID()}`;
    pipeline.zadd(redisKey, now, requestId);

    // Set expiry (window + 1 second buffer)
    pipeline.expire(redisKey, windowSeconds + 1);

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    // Get count before adding current request
    const currentCount = (results[1]?.[1] as number) || 0;
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    const resetTime = now + windowSeconds * 1000;

    // Calculate retry after (time until oldest request expires)
    let retryAfter: number | undefined;
    if (!allowed && currentCount > 0) {
      // Get the oldest request timestamp
      const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');
      if (oldest && oldest.length > 0) {
        const oldestTimestamp = parseInt(oldest[1] as string, 10);
        retryAfter = Math.ceil((oldestTimestamp + windowSeconds * 1000 - now) / 1000);
      }
    }

    const result: {
      allowed: boolean;
      remaining: number;
      resetTime: number;
      retryAfter?: number;
    } = {
      allowed,
      remaining,
      resetTime,
    };

    if (retryAfter !== undefined) {
      result.retryAfter = retryAfter;
    }

    return result;
  }

  /**
   * Check OTP request rate limit (per contact)
   *
   * @param contact Contact (email or phone) - will be normalized
   * @param contactType 'email' | 'phone'
   * @returns Rate limit result
   */
  async checkOTPRequestLimit(
    contact: string,
    contactType: 'email' | 'phone'
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    // Get rate limit config
    const rateLimitConfig = await configService.getRateLimitConfig();

    // Skip rate limiting if disabled
    if (rateLimitConfig.disableRateLimit) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 3600000,
      };
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const key = `otp_request:${contactType}:${normalizedContact}`;
    return await this.checkRateLimit(key, rateLimitConfig.otpRequestPerHour, 3600); // 1 hour
  }

  /**
   * Check IP-based rate limit
   *
   * @param ipAddress IP address
   * @returns Rate limit result
   */
  async checkIPLimit(ipAddress: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    // Get rate limit config
    const rateLimitConfig = await configService.getRateLimitConfig();

    // Skip rate limiting if disabled
    if (rateLimitConfig.disableRateLimit) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 3600000,
      };
    }

    const key = `ip:${ipAddress}`;
    return await this.checkRateLimit(key, rateLimitConfig.ipPerHour, 3600); // 1 hour
  }

  /**
   * Check verification attempt rate limit
   *
   * @param contact Contact (email or phone) - will be normalized
   * @param contactType 'email' | 'phone'
   * @returns Rate limit result
   */
  async checkVerifyLimit(
    contact: string,
    contactType: 'email' | 'phone'
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  }> {
    // Get rate limit config
    const rateLimitConfig = await configService.getRateLimitConfig();

    // Skip rate limiting if disabled
    if (rateLimitConfig.disableRateLimit) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: Date.now() + 600000,
      };
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const key = `verify:${contactType}:${normalizedContact}`;
    return await this.checkRateLimit(key, rateLimitConfig.verifyPer10Min, 600); // 10 minutes
  }

  /**
   * Check resend timer (minimum time between resend requests)
   *
   * @param contact Contact (email or phone) - will be normalized
   * @param contactType 'email' | 'phone'
   * @returns Resend timer result
   */
  async checkResendTimer(
    contact: string,
    contactType: 'email' | 'phone'
  ): Promise<{
    allowed: boolean;
    retryAfter?: number;
  }> {
    // Get rate limit config
    const rateLimitConfig = await configService.getRateLimitConfig();

    // Skip rate limiting if disabled
    if (rateLimitConfig.disableRateLimit) {
      return { allowed: true };
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const key = `resend:${contactType}:${normalizedContact}`;
    const redisKey = `${this.redisPrefix}${key}`;

    // Check if key exists (last resend timestamp)
    const lastResend = await redis.get(redisKey);

    if (!lastResend) {
      // No previous resend, allow and record current time
      await redis.setex(redisKey, rateLimitConfig.resendSeconds, Date.now().toString());
      return { allowed: true };
    }

    const lastResendTime = parseInt(lastResend, 10);
    const now = Date.now();
    const timeSinceLastResend = (now - lastResendTime) / 1000; // seconds

    if (timeSinceLastResend >= rateLimitConfig.resendSeconds) {
      // Enough time has passed, allow and update timestamp
      await redis.setex(redisKey, rateLimitConfig.resendSeconds, now.toString());
      return { allowed: true };
    }

    // Not enough time has passed
    const retryAfter = Math.ceil(rateLimitConfig.resendSeconds - timeSinceLastResend);
    return {
      allowed: false,
      retryAfter,
    };
  }

  /**
   * Reset rate limit for a key
   *
   * @param key Redis key (without prefix)
   */
  async reset(key: string): Promise<void> {
    const redisKey = `${this.redisPrefix}${key}`;
    await redis.del(redisKey);
  }

  /**
   * Reset OTP request rate limit for a contact
   *
   * @param contact Contact (email or phone)
   * @param contactType 'email' | 'phone'
   */
  async resetOTPRequestLimit(contact: string, contactType: 'email' | 'phone'): Promise<void> {
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const key = `otp_request:${contactType}:${normalizedContact}`;
    await this.reset(key);
  }

  /**
   * Reset resend timer for a contact
   *
   * @param contact Contact (email or phone)
   * @param contactType 'email' | 'phone'
   */
  async resetResendTimer(contact: string, contactType: 'email' | 'phone'): Promise<void> {
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const key = `resend:${contactType}:${normalizedContact}`;
    await this.reset(key);
  }

  /**
   * Get rate limit status (for debugging/monitoring)
   *
   * @param key Redis key (without prefix)
   * @returns Rate limit status
   */
  async getStatus(key: string): Promise<{
    count: number;
    ttl: number;
    oldestRequest?: number;
  }> {
    const redisKey = `${this.redisPrefix}${key}`;
    const count = await redis.zcard(redisKey);
    const ttl = await redis.ttl(redisKey);
    const oldest = await redis.zrange(redisKey, 0, 0, 'WITHSCORES');

    const result: {
      count: number;
      ttl: number;
      oldestRequest?: number;
    } = {
      count,
      ttl,
    };

    if (oldest && oldest.length > 0) {
      result.oldestRequest = parseInt(oldest[1] as string, 10);
    }

    return result;
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService();

export default rateLimiterService;
