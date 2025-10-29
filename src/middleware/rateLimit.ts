import { Request, Response, NextFunction } from 'express';
import { emailRateLimit, ipRateLimit, verifyRateLimit } from '../lib/rateLimit';

export async function emailRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await emailRateLimit.check(req);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }
    
    res.set('X-RateLimit-Limit', '5');
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
}

export async function ipRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await ipRateLimit.check(req);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }
    
    res.set('X-RateLimit-Limit', '10');
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
}

export async function verifyRateLimitMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await verifyRateLimit.check(req);
    
    if (!result.allowed) {
      res.status(429).json({
        error: 'Too many verification attempts',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
      return;
    }
    
    res.set('X-RateLimit-Limit', '3');
    res.set('X-RateLimit-Remaining', result.remaining.toString());
    res.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
}
