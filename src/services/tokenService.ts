import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { TokenPayload } from '../types/auth';
import { policyService } from './policyService';

/**
 * Token Service
 *
 * Handles JWT token generation, verification, and refresh token management.
 * Supports both access tokens (short-lived) and refresh tokens (long-lived, stored in DB).
 */

class TokenService {
  private readonly accessTokenSecret = env.SESSION_SECRET;
  private readonly refreshTokenSecret = env.SESSION_SECRET; // In production, use separate secret
  private readonly accessTokenExpiry = 15 * 60; // 15 minutes
  private readonly refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days

  /**
   * Generate access token
   *
   * @param payload Token payload (userId, tenantId, policyVer)
   * @returns JWT access token
   */
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS256',
    });
  }

  /**
   * Generate refresh token and store in database
   *
   * @param payload Token payload (userId, tenantId, policyVer)
   * @param userAgent User agent string
   * @param ipAddress IP address
   * @returns Refresh token string
   */
  async generateRefreshToken(
    payload: TokenPayload,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    // Generate random token
    const token = crypto.randomBytes(32).toString('hex');

    // Hash token for storage
    const tokenHash = crypto.createHash('sha256').update(token).digest();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.refreshTokenExpiry);

    // Store in database (policyVer is stored in JWT, not in DB record)
    const refreshTokenRecord = await prisma.refreshToken.create({
      data: {
        userId: payload.userId,
        tenantId: payload.tenantId || null,
        tokenHash,
        userAgent: userAgent || null,
        ip: ipAddress || null,
        expiresAt,
      },
    });

    // Sign token with payload (includes policyVer) and token ID (for validation)
    return jwt.sign({ ...payload, tokenId: refreshTokenRecord.id }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS256',
    });
  }

  /**
   * Verify access token
   *
   * @param token JWT access token
   * @returns Decoded token payload or null if invalid
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret, {
        algorithms: ['HS256'],
      }) as any;

      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        policyVer: decoded.policyVer,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify refresh token
   *
   * @param token JWT refresh token
   * @returns Decoded token payload or null if invalid
   */
  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      // Verify JWT signature
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
      }) as any;

      // Extract token ID from JWT
      const tokenId = decoded.tokenId;
      if (!tokenId) {
        return null;
      }

      // Find refresh token in database by ID
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { id: tokenId },
      });

      if (!refreshToken) {
        return null;
      }

      // Check if token is revoked
      if (refreshToken.revokedAt) {
        return null;
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        return null;
      }

      // Check if policy version is still valid
      const currentPolicyVer = await policyService.getPolicyVersion();
      if (decoded.policyVer < currentPolicyVer) {
        // Token is stale, revoke it
        await prisma.refreshToken.update({
          where: { id: refreshToken.id },
          data: { revokedAt: new Date() },
        });
        return null;
      }

      return {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        policyVer: decoded.policyVer,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Revoke a refresh token
   *
   * @param token Refresh token string
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret, {
        algorithms: ['HS256'],
      }) as any;

      const tokenId = decoded.tokenId;
      if (!tokenId) {
        return;
      }

      await prisma.refreshToken.update({
        where: { id: tokenId },
        data: {
          revokedAt: new Date(),
        },
      });
    } catch (error) {
      // Token is invalid, nothing to revoke
    }
  }

  /**
   * Revoke all refresh tokens for a user
   *
   * @param userId User UUID
   * @param tenantId Optional tenant UUID (if provided, only revoke tokens for that tenant)
   */
  async revokeAllRefreshTokens(userId: string, tenantId?: string): Promise<void> {
    const where: any = {
      userId,
      revokedAt: null,
    };

    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    await prisma.refreshToken.updateMany({
      where,
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Clean up expired refresh tokens
   * Should be called periodically (e.g., via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return result.count;
  }
}

export const tokenService = new TokenService();
