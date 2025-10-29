import { redis } from './redis';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: any) => string;
}

export class RateLimiter {
  private windowMs: number;
  private max: number;
  private keyGenerator: (req: any) => string;

  constructor(options: RateLimitOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip);
  }

  async check(req: any): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rl:${this.keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Use Redis pipeline for atomic operations
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);

    // Count current entries
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    pipeline.expire(key, Math.ceil(this.windowMs / 1000));

    const results = await pipeline.exec();

    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const currentCount = (results?.[1]?.[1] as number) || 0;
    const allowed = currentCount < this.max;
    const remaining = Math.max(0, this.max - currentCount - 1);
    const resetTime = now + this.windowMs;

    return { allowed, remaining, resetTime };
  }

  async reset(req: any): Promise<void> {
    const key = `rl:${this.keyGenerator(req)}`;
    await redis.del(key);
  }
}

// Pre-configured rate limiters
export const emailRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  keyGenerator: (req) => `email:${req.body.email}`,
});

export const ipRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => `ip:${req.ip}`,
});

export const verifyRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 verification attempts per minute
  keyGenerator: (req) => `verify:${req.body.email || req.body.token}`,
});
