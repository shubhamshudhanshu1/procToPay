import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { mailer } from '../lib/mailer';
import {
  generateOTP,
  generateToken,
  hashOTP,
  verifyOTP,
  hashIP,
  hashUA,
  normalizeEmail,
} from '../lib/crypto';
import { env } from '../config/env';
import {
  emailRateLimitMiddleware,
  ipRateLimitMiddleware,
  verifyRateLimitMiddleware,
} from '../middleware/rateLimit';

const router: Router = Router();

// Validation schemas
const requestSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
});

const verifyOTPSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  otp: z.string().min(4).max(8),
});

const verifyMagicSchema = z.object({
  token: z.string().min(1),
});

// POST /auth/request
router.post(
  '/request',
  emailRateLimitMiddleware,
  ipRateLimitMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { email } = requestSchema.parse(req.body);

      // Generate token based on auth mode
      let token: string;
      let kind: 'otp' | 'magic';

      if (env.AUTH_MODE === 'otp') {
        token = generateOTP(env.OTP_LENGTH);
        kind = 'otp';
      } else {
        token = generateToken(32); // 256-bit token
        kind = 'magic';
      }
      console.log('Checkingggg');

      const expiresAt = new Date(Date.now() + env.OTP_TTL_SECONDS * 1000);
      const ipHash = req.ip ? hashIP(req.ip) : null;
      const uaHash = req.headers['user-agent'] ? hashUA(req.headers['user-agent']) : null;

      // Store token in database
      await prisma.loginToken.create({
        data: {
          email,
          token: env.AUTH_MODE === 'otp' ? hashOTP(email, token) : token,
          kind,
          ipHash,
          uaHash,
          expiresAt,
        },
      });

      // Send email
      if (env.AUTH_MODE === 'otp') {
        await mailer.sendOTPEmail(email, token, Math.floor(env.OTP_TTL_SECONDS / 60));
      } else {
        const magicLink = `${env.APP_URL}/auth/verify?token=${token}`;
        await mailer.sendMagicLinkEmail(email, magicLink, Math.floor(env.OTP_TTL_SECONDS / 60));
      }

      // Always return 204 to prevent user enumeration
      res.status(204).send();
    } catch (error) {
      console.error('Auth request error:', error);
      res.status(204).send(); // Still return 204 to prevent user enumeration
    }
  }
);

// POST /auth/verify (OTP mode)
router.post('/verify', verifyRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    if (env.AUTH_MODE === 'otp') {
      const { email, otp } = verifyOTPSchema.parse(req.body);

      // Find the most recent unused token for this email
      const loginToken = await prisma.loginToken.findFirst({
        where: {
          email,
          kind: 'otp',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!loginToken || !verifyOTP(email, otp, loginToken.token)) {
        res.status(400).json({ error: 'Invalid or expired code' });
        return;
      }

      // Mark token as used
      await prisma.loginToken.update({
        where: { id: loginToken.id },
        data: { usedAt: new Date() },
      });

      // Upsert user
      const user = await prisma.user.upsert({
        where: { email },
        update: {
          emailVerifiedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
        create: {
          email,
          emailVerifiedAt: new Date(),
          createdVia: 'email_passwordless',
        },
      });

      // Regenerate session
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set user ID in session
      (req.session as any).userId = user.id;

      // Add session to user's session index
      const sessionId = req.sessionID;
      if (sessionId) {
        await redis.sadd(`user_session_index:${user.id}`, sessionId);
      }

      res.status(204).send();
    } else {
      res.status(400).json({ error: 'OTP mode not enabled' });
    }
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// GET /auth/verify (Magic link mode)
router.get('/verify', verifyRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    if (env.AUTH_MODE === 'magic') {
      const { token } = verifyMagicSchema.parse(req.query);

      // Find the token
      const loginToken = await prisma.loginToken.findFirst({
        where: {
          token,
          kind: 'magic',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!loginToken) {
        res.status(400).json({ error: 'Invalid or expired link' });
        return;
      }

      // Mark token as used
      await prisma.loginToken.update({
        where: { id: loginToken.id },
        data: { usedAt: new Date() },
      });

      // Upsert user
      const user = await prisma.user.upsert({
        where: { email: loginToken.email },
        update: {
          emailVerifiedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
        create: {
          email: loginToken.email,
          emailVerifiedAt: new Date(),
          createdVia: 'email_passwordless',
        },
      });

      // Regenerate session
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set user ID in session
      (req.session as any).userId = user.id;

      // Add session to user's session index
      const sessionId = req.sessionID;
      if (sessionId) {
        await redis.sadd(`user_session_index:${user.id}`, sessionId);
      }

      // Redirect to app
      res.redirect(env.APP_URL);
    } else {
      res.status(400).json({ error: 'Magic link mode not enabled' });
    }
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// POST /auth/verify (Magic link mode - API endpoint)
router.post('/verify-magic', verifyRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    if (env.AUTH_MODE === 'magic') {
      const { token } = verifyMagicSchema.parse(req.body);

      // Find the token
      const loginToken = await prisma.loginToken.findFirst({
        where: {
          token,
          kind: 'magic',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!loginToken) {
        res.status(400).json({ error: 'Invalid or expired link' });
        return;
      }

      // Mark token as used
      await prisma.loginToken.update({
        where: { id: loginToken.id },
        data: { usedAt: new Date() },
      });

      // Upsert user
      const user = await prisma.user.upsert({
        where: { email: loginToken.email },
        update: {
          emailVerifiedAt: new Date(),
          tokenVersion: { increment: 1 },
        },
        create: {
          email: loginToken.email,
          emailVerifiedAt: new Date(),
          createdVia: 'email_passwordless',
        },
      });

      // Regenerate session
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set user ID in session
      (req.session as any).userId = user.id;

      // Add session to user's session index
      const sessionId = req.sessionID;
      if (sessionId) {
        await redis.sadd(`user_session_index:${user.id}`, sessionId);
      }

      res.status(204).send();
    } else {
      res.status(400).json({ error: 'Magic link mode not enabled' });
    }
  } catch (error) {
    console.error('Auth verify error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

export default router;
