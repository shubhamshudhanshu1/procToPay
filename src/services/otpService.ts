import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { env } from '../config/env';
import { configService } from './configService';
import { contactService } from './contactService';

/**
 * OTP Service
 *
 * Handles OTP generation, storage, verification, and cleanup.
 * Uses Redis for fast verification and Database for audit trail.
 */
class OTPService {
  private readonly redisPrefix = 'otp:';
  // Redis TTL is set dynamically based on OTP expiry config

  /**
   * Generate cryptographically secure OTP
   *
   * @param length OTP length (4-8 digits)
   * @returns Numeric OTP string
   */
  private generateSecureOTP(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;

    // Use crypto.randomInt for cryptographically secure random number
    const randomValue = crypto.randomInt(min, max + 1);
    return randomValue.toString().padStart(length, '0');
  }

  /**
   * Generate hardcoded OTP (last N digits of phone number, where N is configured OTP length)
   *
   * @param phone Phone number in E.164 format
   * @param length OTP length from configuration
   * @returns Last N digits as OTP (padded with leading zeros if phone is shorter)
   */
  private getHardcodedOTP(phone: string, length: number): string {
    // Remove + and get last N digits
    const digitsOnly = phone.replace(/[^\d]/g, '');
    const lastDigits = digitsOnly.slice(-length);

    // If phone number is shorter than required length, pad with leading zeros
    // This ensures the OTP always matches the configured length
    return lastDigits.padStart(length, '0');
  }

  /**
   * Hash OTP using HMAC-SHA256
   *
   * @param contact Normalized contact (email or phone)
   * @param otp Plain OTP
   * @returns Hashed OTP
   */
  private hashOTP(contact: string, otp: string): string {
    return crypto
      .createHmac('sha256', env.SESSION_SECRET)
      .update(`${contact}:${otp}`)
      .digest('hex');
  }

  /**
   * Verify OTP hash using constant-time comparison
   *
   * @param contact Normalized contact
   * @param otp Plain OTP
   * @param hashedOTP Stored hash
   * @returns true if valid
   */
  private verifyOTPHash(contact: string, otp: string, hashedOTP: string): boolean {
    const computedHash = this.hashOTP(contact, otp);
    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(hashedOTP, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate and store OTP
   *
   * @param contact Contact (email or phone) - will be normalized
   * @param contactType 'email' | 'phone'
   * @param ipAddress IP address (optional, for audit)
   * @param userAgent User agent (optional, for audit)
   * @returns Plain OTP (for sending to user)
   */
  async generateOTP(
    contact: string,
    contactType: 'email' | 'phone',
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Get OTP configuration
    const otpConfig = await configService.getOTPConfig();

    // Generate OTP (hardcoded or secure)
    let otp: string;
    if (otpConfig.hardcodedEnabled && contactType === 'phone') {
      otp = this.getHardcodedOTP(normalizedContact, otpConfig.length);
    } else {
      otp = this.generateSecureOTP(otpConfig.length);
    }

    // Hash OTP
    const tokenHash = this.hashOTP(normalizedContact, otp);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + otpConfig.expirySeconds * 1000);

    // Hash IP and User-Agent for privacy
    const ipHash = ipAddress ? this.hashIP(ipAddress) : null;
    const uaHash = userAgent ? this.hashUA(userAgent) : null;

    // Store in database (for audit trail)
    const otpToken = await prisma.otpToken.create({
      data: {
        contact: normalizedContact,
        contactType,
        tokenHash,
        maxAttempts: otpConfig.maxAttempts,
        ipHash,
        uaHash,
        expiresAt,
        status: 'pending',
      },
    });

    // Store in Redis (for fast verification)
    const redisKey = `${this.redisPrefix}${otpToken.id}`;
    const redisData = {
      contact: normalizedContact,
      contactType,
      tokenHash,
      attempts: 0,
      maxAttempts: otpConfig.maxAttempts,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    await redis.setex(redisKey, otpConfig.expirySeconds, JSON.stringify(redisData));

    // Also store a lookup by contact for rate limiting
    const contactKey = `${this.redisPrefix}contact:${contactType}:${normalizedContact}`;
    await redis.setex(contactKey, otpConfig.expirySeconds, otpToken.id);

    return otp;
  }

  /**
   * Verify OTP
   *
   * @param contact Contact (email or phone) - will be normalized
   * @param contactType 'email' | 'phone'
   * @param otp Plain OTP to verify
   * @returns Verification result
   */
  async verifyOTP(
    contact: string,
    contactType: 'email' | 'phone',
    otp: string
  ): Promise<{
    valid: boolean;
    reason?: 'invalid' | 'expired' | 'max_attempts' | 'already_used';
    attemptsRemaining?: number;
  }> {
    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Get OTP config to check if hardcoded OTP is enabled
    const otpConfig = await configService.getOTPConfig();

    // For hardcoded OTP (phone only), verify directly against phone number
    if (otpConfig.hardcodedEnabled && contactType === 'phone') {
      const expectedOTP = this.getHardcodedOTP(normalizedContact, otpConfig.length);
      if (otp === expectedOTP) {
        // Hardcoded OTP is valid - find and mark the most recent OTP token as verified
        // This allows us to track verification in the database for audit purposes
        const otpToken = await prisma.otpToken.findFirst({
          where: {
            contact: normalizedContact,
            contactType,
            status: 'pending',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (otpToken) {
          // Mark as verified for audit trail
          await prisma.otpToken.update({
            where: { id: otpToken.id },
            data: {
              status: 'verified',
              usedAt: new Date(),
              attempts: otpToken.attempts + 1,
            },
          });

          // Remove from Redis
          await redis.del(`${this.redisPrefix}${otpToken.id}`);
          await redis.del(`${this.redisPrefix}contact:${contactType}:${normalizedContact}`);
        }

        return {
          valid: true,
        };
      } else {
        return {
          valid: false,
          reason: 'invalid',
        };
      }
    }

    // For non-hardcoded OTP, check database expiry
    const otpToken = await prisma.otpToken.findFirst({
      where: {
        contact: normalizedContact,
        contactType,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpToken) {
      return {
        valid: false,
        reason: 'expired',
      };
    }

    // Check if already used
    if (otpToken.status === 'verified') {
      return {
        valid: false,
        reason: 'already_used',
      };
    }

    // Check max attempts
    if (otpToken.attempts >= otpToken.maxAttempts) {
      await prisma.otpToken.update({
        where: { id: otpToken.id },
        data: {
          status: 'failed',
          failedReason: 'max_attempts_exceeded',
        },
      });

      // Remove from Redis
      await redis.del(`${this.redisPrefix}${otpToken.id}`);
      await redis.del(`${this.redisPrefix}contact:${contactType}:${normalizedContact}`);

      return {
        valid: false,
        reason: 'max_attempts',
      };
    }

    // Verify OTP hash
    const isValid = this.verifyOTPHash(normalizedContact, otp, otpToken.tokenHash);

    // Increment attempts
    const newAttempts = otpToken.attempts + 1;

    if (isValid) {
      // Mark as verified
      await prisma.otpToken.update({
        where: { id: otpToken.id },
        data: {
          status: 'verified',
          usedAt: new Date(),
          attempts: newAttempts,
        },
      });

      // Remove from Redis
      await redis.del(`${this.redisPrefix}${otpToken.id}`);
      await redis.del(`${this.redisPrefix}contact:${contactType}:${normalizedContact}`);

      return {
        valid: true,
        attemptsRemaining: otpToken.maxAttempts - newAttempts,
      };
    } else {
      // Update attempts
      await prisma.otpToken.update({
        where: { id: otpToken.id },
        data: {
          attempts: newAttempts,
        },
      });

      // Update Redis
      const redisKey = `${this.redisPrefix}${otpToken.id}`;
      const redisData = await redis.get(redisKey);
      if (redisData) {
        const data = JSON.parse(redisData);
        data.attempts = newAttempts;
        const ttl = await redis.ttl(redisKey);
        if (ttl > 0) {
          await redis.setex(redisKey, ttl, JSON.stringify(data));
        }
      }

      const attemptsRemaining = otpToken.maxAttempts - newAttempts;

      // Check if max attempts reached
      if (attemptsRemaining <= 0) {
        await prisma.otpToken.update({
          where: { id: otpToken.id },
          data: {
            status: 'failed',
            failedReason: 'max_attempts_exceeded',
          },
        });

        await redis.del(redisKey);
        await redis.del(`${this.redisPrefix}contact:${contactType}:${normalizedContact}`);

        return {
          valid: false,
          reason: 'max_attempts',
          attemptsRemaining: 0,
        };
      }

      return {
        valid: false,
        reason: 'invalid',
        attemptsRemaining,
      };
    }
  }

  /**
   * Invalidate OTP (mark as expired/failed)
   *
   * @param contact Contact (email or phone)
   * @param contactType 'email' | 'phone'
   * @param reason Reason for invalidation
   */
  async invalidateOTP(
    contact: string,
    contactType: 'email' | 'phone',
    reason: string = 'manual_invalidation'
  ): Promise<void> {
    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Find pending OTP tokens
    const otpTokens = await prisma.otpToken.findMany({
      where: {
        contact: normalizedContact,
        contactType,
        status: 'pending',
      },
    });

    // Mark all as expired
    for (const token of otpTokens) {
      await prisma.otpToken.update({
        where: { id: token.id },
        data: {
          status: 'expired',
          failedReason: reason,
        },
      });

      // Remove from Redis
      await redis.del(`${this.redisPrefix}${token.id}`);
    }

    await redis.del(`${this.redisPrefix}contact:${contactType}:${normalizedContact}`);
  }

  /**
   * Cleanup expired OTPs (should be run periodically)
   *
   * @param batchSize Number of tokens to process at once
   */
  async cleanupExpiredOTPs(batchSize: number = 100): Promise<number> {
    const expiredTokens = await prisma.otpToken.findMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { status: { in: ['expired', 'failed'] } }],
        status: { not: 'verified' },
      },
      take: batchSize,
      select: {
        id: true,
        contact: true,
        contactType: true,
      },
    });

    let cleaned = 0;

    for (const token of expiredTokens) {
      // Update status if not already updated
      await prisma.otpToken.updateMany({
        where: {
          id: token.id,
          status: { not: 'verified' },
        },
        data: {
          status: 'expired',
        },
      });

      // Remove from Redis
      await redis.del(`${this.redisPrefix}${token.id}`);
      await redis.del(`${this.redisPrefix}contact:${token.contactType}:${token.contact}`);

      cleaned++;
    }

    return cleaned;
  }

  /**
   * Get OTP status (for debugging/monitoring)
   *
   * @param contact Contact (email or phone)
   * @param contactType 'email' | 'phone'
   * @returns OTP status or null
   */
  async getOTPStatus(
    contact: string,
    contactType: 'email' | 'phone'
  ): Promise<{
    id: string;
    contact: string;
    contactType: string;
    attempts: number;
    maxAttempts: number;
    status: string;
    expiresAt: Date;
    createdAt: Date;
  } | null> {
    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const otpToken = await prisma.otpToken.findFirst({
      where: {
        contact: normalizedContact,
        contactType,
        status: 'pending',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        contact: true,
        contactType: true,
        attempts: true,
        maxAttempts: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return otpToken;
  }

  /**
   * Hash IP address for privacy
   */
  private hashIP(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
  }

  /**
   * Hash User-Agent for privacy
   */
  private hashUA(userAgent: string): string {
    return crypto.createHash('sha256').update(userAgent).digest('hex');
  }
}

// Export singleton instance
export const otpService = new OTPService();

export default otpService;
