import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

type ConfigValue = string | number | boolean | object;

interface ConfigCache {
  [key: string]: ConfigValue;
}

interface OTPConfig {
  length: number;
  expirySeconds: number;
  maxAttempts: number;
  hardcodedEnabled: boolean;
}

interface RateLimitConfig {
  otpRequestPerHour: number;
  ipPerHour: number;
  verifyPer10Min: number;
  resendSeconds: number;
}

/**
 * Configuration Service
 *
 * Manages application configuration stored in database with Redis caching.
 * Provides type-safe access to configuration values.
 */
class ConfigService {
  private cache: ConfigCache = {};
  private cacheKey = 'app:config';
  private cacheTTL = 300; // 5 minutes
  private initialized = false;

  /**
   * Load all configurations from database into cache
   */
  async loadAll(): Promise<void> {
    try {
      // Try Redis cache first
      const cached = await redis.get(this.cacheKey);
      if (cached) {
        this.cache = JSON.parse(cached);
        this.initialized = true;
        return;
      }

      // Load from database
      const configs = await prisma.configuration.findMany({
        where: { isActive: true },
      });

      // Build cache object
      this.cache = {};
      for (const config of configs) {
        this.cache[config.key] = this.parseValue(config.value, config.type);
      }

      // Cache in Redis
      await redis.setex(this.cacheKey, this.cacheTTL, JSON.stringify(this.cache));
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load configurations:', error);
      // Continue with empty cache if database/redis fails
      this.cache = {};
      this.initialized = true;
    }
  }

  /**
   * Get configuration value
   * @param key Configuration key (e.g., 'otp.length')
   * @param defaultValue Default value if not found
   * @returns Configuration value
   */
  async get<T extends ConfigValue>(key: string, defaultValue: T): Promise<T> {
    // Ensure cache is loaded
    if (!this.initialized) {
      await this.loadAll();
    }

    // Check cache first
    if (this.cache[key] !== undefined) {
      return this.cache[key] as T;
    }

    // Load from database if not cached
    try {
      const config = await prisma.configuration.findUnique({
        where: { key },
      });

      if (!config || !config.isActive) {
        return defaultValue;
      }

      const value = this.parseValue(config.value, config.type) as T;

      // Update cache
      this.cache[key] = value;
      await this.updateCache();

      return value;
    } catch (error) {
      console.error(`Failed to get config ${key}:`, error);
      return defaultValue;
    }
  }

  /**
   * Set configuration value
   * @param key Configuration key
   * @param value Configuration value
   * @param type Value type
   * @param updatedBy User ID who updated (optional)
   */
  async set(
    key: string,
    value: ConfigValue,
    type: 'number' | 'string' | 'boolean' | 'json',
    updatedBy?: string
  ): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    try {
      // Update database
      await prisma.configuration.upsert({
        where: { key },
        update: {
          value: stringValue,
          type,
          updatedBy,
          updatedAt: new Date(),
        },
        create: {
          key,
          value: stringValue,
          type,
          category: this.getCategory(key),
          description: this.getDescription(key),
          updatedBy,
        },
      });

      // Invalidate cache
      await redis.del(this.cacheKey);
      delete this.cache[key];

      // Reload cache
      await this.loadAll();
    } catch (error) {
      console.error(`Failed to set config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get OTP configuration
   */
  async getOTPConfig(): Promise<OTPConfig> {
    return {
      length: await this.get<number>('otp.length', 6),
      expirySeconds: await this.get<number>('otp.expiry_seconds', 600),
      maxAttempts: await this.get<number>('otp.max_attempts', 3),
      hardcodedEnabled: await this.get<boolean>('otp.hardcoded_enabled', false),
    };
  }

  /**
   * Get rate limit configuration
   */
  async getRateLimitConfig(): Promise<RateLimitConfig> {
    return {
      otpRequestPerHour: await this.get<number>('rate_limit.otp_request_per_hour', 5),
      ipPerHour: await this.get<number>('rate_limit.ip_per_hour', 10),
      verifyPer10Min: await this.get<number>('rate_limit.verify_per_10min', 3),
      resendSeconds: await this.get<number>('rate_limit.resend_seconds', 60),
    };
  }

  /**
   * Get contact configuration
   */
  async getContactConfig() {
    return {
      defaultCountryCode: await this.get<string>('contact.default_country_code', '+1'),
      emailEnabled: await this.get<boolean>('contact.email_enabled', true),
      phoneEnabled: await this.get<boolean>('contact.phone_enabled', true),
    };
  }

  /**
   * Get feature flags
   */
  async getFeatureFlags() {
    return {
      registrationEnabled: await this.get<boolean>('feature.registration_enabled', true),
      loginEnabled: await this.get<boolean>('feature.login_enabled', true),
      smsEnabled: await this.get<boolean>('feature.sms_enabled', false),
    };
  }

  /**
   * Parse value based on type
   */
  private parseValue(value: string, type: string): ConfigValue {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true' || value === '1';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Get category from key
   */
  private getCategory(key: string): string {
    if (key.startsWith('otp.')) return 'otp';
    if (key.startsWith('rate_limit.')) return 'rate_limit';
    if (key.startsWith('contact.')) return 'contact';
    if (key.startsWith('security.')) return 'security';
    if (key.startsWith('feature.')) return 'feature';
    return 'general';
  }

  /**
   * Get description from key
   */
  private getDescription(key: string): string {
    const descriptions: Record<string, string> = {
      'otp.length': 'OTP code length (4-8 digits)',
      'otp.expiry_seconds': 'OTP expiry time in seconds',
      'otp.max_attempts': 'Maximum verification attempts per OTP',
      'otp.hardcoded_enabled': 'Enable hardcoded OTP (uses last 4 digits of phone for testing)',
      'rate_limit.otp_request_per_hour': 'OTP requests per hour per contact',
      'rate_limit.ip_per_hour': 'Requests per hour per IP address',
      'rate_limit.verify_per_10min': 'Verification attempts per 10 minutes',
      'rate_limit.resend_seconds': 'Minimum seconds between resend requests',
      'contact.default_country_code': 'Default country code for phone numbers',
      'contact.email_enabled': 'Enable email authentication',
      'contact.phone_enabled': 'Enable phone authentication',
      'security.session_ttl_seconds': 'Session expiry time in seconds',
      'feature.registration_enabled': 'Enable user registration',
      'feature.login_enabled': 'Enable user login',
      'feature.sms_enabled': 'Enable SMS OTP delivery',
    };
    return descriptions[key] || '';
  }

  /**
   * Update Redis cache
   */
  private async updateCache(): Promise<void> {
    try {
      await redis.setex(this.cacheKey, this.cacheTTL, JSON.stringify(this.cache));
    } catch (error) {
      console.error('Failed to update cache:', error);
      // Don't throw - cache is optional
    }
  }

  /**
   * Initialize configuration service
   * Call this on application startup
   */
  async initialize(): Promise<void> {
    await this.loadAll();
  }

  /**
   * Clear cache (useful for testing)
   */
  async clearCache(): Promise<void> {
    await redis.del(this.cacheKey);
    this.cache = {};
    this.initialized = false;
  }
}

// Export singleton instance
export const configService = new ConfigService();

// Initialize on module load (non-blocking)
if (process.env['NODE_ENV'] !== 'test') {
  configService.initialize().catch((error) => {
    console.error('Failed to initialize config service:', error);
  });
}

export type { OTPConfig, RateLimitConfig };
