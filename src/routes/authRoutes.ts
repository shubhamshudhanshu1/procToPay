import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authService } from '../services/authService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { redis } from '../lib/redis';
import {
  loginRequestSchema,
  loginVerifySchema,
  registerSchema,
  registerVerifySchema,
} from '../schemas/authSchemas';

const router: Router = Router();

/**
 * POST /api/auth/login/request
 * Request OTP for login
 */
router.post('/login/request', async (req: Request, res: Response) => {
  try {
    const { contact } = loginRequestSchema.parse(req.body);

    await authService.requestOTP(contact, req.ip, req.headers['user-agent']);

    // Return 204 to prevent user enumeration
    res.status(204).send();
    return;
  } catch (error: any) {
    // Handle specific errors that should be returned to frontend
    if (error.message?.includes('Rate limit')) {
      return res.status(429).json({
        error: error.message,
      });
    }

    if (error.message?.includes('not verified')) {
      return res.status(403).json({
        error: error.message,
      });
    }

    if (error.message?.includes('not found') || error.message?.includes('register first')) {
      return res.status(404).json({
        error: error.message,
      });
    }

    // Log other errors but still return 204 to prevent user enumeration
    if (error instanceof ZodError) {
      // Validation errors - still return 204 for security
      console.error('Login request validation error:', error.errors);
    } else {
      console.error('Login request error:', error);
    }
    return res.status(204).send();
  }
});

/**
 * POST /api/auth/login/verify
 * Verify OTP for login
 * After verification, generates a short-lived session token (no tenantId yet)
 * User must select tenant before getting full access token
 */
router.post('/login/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contact, otp } = loginVerifySchema.parse(req.body);

    const user = await authService.verifyOTP(contact, otp);

    // Get policy version
    const { policyService } = await import('../services/policyService');
    const policyVer = await policyService.getPolicyVersion();

    // Generate short-lived session token (no tenantId yet)
    const { tokenService } = await import('../services/tokenService');
    const sessionToken = tokenService.generateAccessToken({
      userId: user.userId,
      policyVer,
      // tenantId is not set yet - will be set after tenant selection
    });

    // Also create session for backward compatibility
    (req.session as any).userId = user.userId;
    (req.session as any).email = user.email;
    (req.session as any).phoneNumber = user.phoneNumber;
    (req.session as any).firstName = user.firstName;
    (req.session as any).lastName = user.lastName;

    res.json({
      success: true,
      requiresTenantSelection: true, // Indicates user needs to select tenant
      sessionToken, // Short-lived token for tenant selection
      user: {
        id: user.userId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    // Convert error to proper format
    if (error instanceof ZodError) {
      return next(error);
    }
    // Create error object with status code
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 400;
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Register new user and send OTP
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, email, phoneNumber } = registerSchema.parse(req.body);

    const result = await authService.register(
      firstName,
      lastName,
      email,
      phoneNumber,
      req.ip,
      req.headers['user-agent']
    );

    res.status(201).json({
      success: true,
      userId: result.userId,
      contactType: result.contactType,
      message: `Verification code sent to your contact channels.`,
    });
  } catch (error: any) {
    // Convert error to proper format
    if (error instanceof ZodError) {
      return next(error);
    }
    // Create error object with status code
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 400;
    next(err);
  }
});

/**
 * POST /api/auth/register/resend
 * Resend OTP for registration (for pending users only)
 */
router.post('/register/resend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contact } = loginRequestSchema.parse(req.body); // Reuse same schema

    await authService.resendRegistrationOTP(contact, req.ip, req.headers['user-agent']);

    // Return 204 to prevent user enumeration
    res.status(204).send();
    return;
  } catch (error: any) {
    // Handle specific errors that should be returned to frontend
    if (error.message?.includes('Rate limit')) {
      return res.status(429).json({
        error: error.message,
      });
    }

    if (
      error.message?.includes('not found') ||
      error.message?.includes('already completed') ||
      error.message?.includes('Registration is currently disabled') ||
      error.message?.includes('authentication is disabled')
    ) {
      return res.status(403).json({
        error: error.message,
      });
    }

    // Log other errors but still return 204 to prevent user enumeration
    if (error instanceof ZodError) {
      // Validation errors - still return 204 for security
      console.error('Registration resend validation error:', error.errors);
    } else {
      console.error('Registration resend error:', error);
    }
    return res.status(204).send();
  }
});

/**
 * POST /api/auth/register/verify
 * Verify OTP for registration
 * After verification, generates a short-lived session token (no tenantId yet)
 * User must select tenant before getting full access token
 */
router.post('/register/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, contact, otp } = registerVerifySchema.parse(req.body);

    const user = await authService.verifyRegistrationOTP(userId, contact, otp);

    // Get policy version
    const { policyService } = await import('../services/policyService');
    const policyVer = await policyService.getPolicyVersion();

    // Generate short-lived session token (no tenantId yet)
    const { tokenService } = await import('../services/tokenService');
    const sessionToken = tokenService.generateAccessToken({
      userId: user.userId,
      policyVer,
      // tenantId is not set yet - will be set after tenant selection
    });

    // Also create session for backward compatibility
    (req.session as any).userId = user.userId;
    (req.session as any).email = user.email;
    (req.session as any).phoneNumber = user.phoneNumber;
    (req.session as any).firstName = user.firstName;
    (req.session as any).lastName = user.lastName;

    res.json({
      success: true,
      requiresTenantSelection: true, // Indicates user needs to select tenant
      sessionToken, // Short-lived token for tenant selection
      user: {
        id: user.userId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: any) {
    // Convert error to proper format
    if (error instanceof ZodError) {
      return next(error);
    }
    // Create error object with status code
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 400;
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Logout user - revokes refresh tokens and clears session
 */
router.post(
  '/logout',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId || req.session?.userId;
      const tenantId = req.tenantId || req.session?.tenantId;
      const sessionId = req.sessionID;

      // Clean up Redis session (for backward compatibility with session-based auth)
      if (sessionId && userId) {
        try {
          await redis.del(`sess:${sessionId}`);
          await redis.srem(`user_session_index:${userId}`, sessionId);
        } catch (redisError) {
          // Log but don't fail logout if Redis cleanup fails
          console.warn('Redis session cleanup error:', redisError);
        }
      }

      // Revoke refresh tokens for this user (and tenant if specified)
      if (userId) {
        const { tokenService } = await import('../services/tokenService');
        await tokenService.revokeAllRefreshTokens(userId, tenantId);

        // Audit log
        const { auditService } = await import('../services/auditService');
        await auditService.logAction({
          ...(userId && { actorUserId: userId }),
          ...(tenantId && { tenantId }),
          action: 'auth.logout',
          resource: `user:${userId}`,
          ...(req.ip && { ip: req.ip }),
          ...(req.headers['user-agent'] && { userAgent: req.headers['user-agent'] }),
        });
      }

      // Destroy session
      req.session.destroy((err: any) => {
        if (err) {
          return next(err);
        }
        res.clearCookie('sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    } catch (error: any) {
      // Convert error to proper format
      if (error instanceof ZodError) {
        return next(error);
      }
      // Create error object with status code
      const err: any = new Error(error.message || 'An error occurred');
      err.statusCode = error.statusCode || 400;
      next(err);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers.authorization?.replace('Bearer ', '');

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const { tokenService } = await import('../services/tokenService');
    const { policyService } = await import('../services/policyService');

    // Verify refresh token
    const payload = await tokenService.verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    // Get current policy version
    const currentPolicyVer = await policyService.getPolicyVersion();

    // Generate new access token
    const tokenPayload: any = {
      userId: payload.userId,
      policyVer: currentPolicyVer,
    };
    if (payload.tenantId) {
      tokenPayload.tenantId = payload.tenantId;
    }
    const accessToken = tokenService.generateAccessToken(tokenPayload);

    res.json({
      success: true,
      accessToken,
      expiresIn: 15 * 60, // 15 minutes
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return next(error);
    }
    const err: any = new Error(error.message || 'An error occurred');
    err.statusCode = error.statusCode || 401;
    next(err);
  }
});

export default router;
