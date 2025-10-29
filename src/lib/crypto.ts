import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

/**
 * Generate a cryptographically secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric OTP of specified length
 */
export function generateOTP(length: number): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Hash OTP using HMAC for secure storage
 */
export function hashOTP(email: string, otp: string): string {
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(`${email}:${otp}`)
    .digest('hex');
}

/**
 * Verify OTP using constant-time comparison
 */
export function verifyOTP(email: string, otp: string, hashedOTP: string): boolean {
  const computedHash = hashOTP(email, otp);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hashedOTP, 'hex')
  );
}

/**
 * Hash IP address for privacy
 */
export function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Hash User-Agent for privacy
 */
export function hashUA(userAgent: string): string {
  return crypto.createHash('sha256').update(userAgent).digest('hex');
}

/**
 * Generate a signed JWT for magic links
 */
export function signMagicToken(email: string, expiresIn: number = 600): string {
  const payload = {
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
  };
  
  return jwt.sign(payload, env.SESSION_SECRET, { algorithm: 'HS256' });
}

/**
 * Verify and decode a magic link JWT
 */
export function verifyMagicToken(token: string): { email: string; iat: number; exp: number } | null {
  try {
    const decoded = jwt.verify(token, env.SESSION_SECRET, { algorithms: ['HS256'] }) as any;
    return {
      email: decoded.email,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Generate a secure random string for session IDs
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}
