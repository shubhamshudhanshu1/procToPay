import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { authService } from '../services/authService';
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

    // Always return 204 to prevent user enumeration
    return res.status(204).send();
  } catch (error: any) {
    const errorMessage = error?.message || '';

    // Check if it's a rate limit error
    const isRateLimitError =
      errorMessage.includes('Rate limit exceeded') ||
      errorMessage.includes('Please wait') ||
      errorMessage.includes('Too many requests');

    // Check if it's a user not found error
    const isUserNotFoundError = errorMessage.includes('User not found');

    // Check if it's a verification error
    const isVerificationError =
      errorMessage.includes('is not verified') ||
      errorMessage.includes('Email is not verified') ||
      errorMessage.includes('Phone number is not verified');

    if (isRateLimitError) {
      // Return rate limit error to frontend
      console.error('Login request rate limit error:', error);
      return res.status(429).json({
        success: false,
        error: errorMessage,
      });
    }

    if (isUserNotFoundError) {
      // Return user not found error to frontend
      console.error('Login request user not found error:', error);
      return res.status(404).json({
        success: false,
        error: errorMessage,
      });
    }

    if (isVerificationError) {
      // Return verification error to frontend
      console.error('Login request verification error:', error);
      return res.status(403).json({
        success: false,
        error: errorMessage,
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
 */
router.post('/login/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contact, otp } = loginVerifySchema.parse(req.body);

    const user = await authService.verifyOTP(contact, otp);

    // Create session
    (req.session as any).userId = user.userId;
    (req.session as any).email = user.email;
    (req.session as any).phoneNumber = user.phoneNumber;
    (req.session as any).firstName = user.firstName;
    (req.session as any).lastName = user.lastName;

    res.json({
      success: true,
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
      message: `Verification code sent to your ${result.contactType}`,
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
 * POST /api/auth/register/verify
 * Verify OTP for registration
 */
router.post('/register/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, contact, otp } = registerVerifySchema.parse(req.body);

    const user = await authService.verifyRegistrationOTP(userId, contact, otp);

    // Create session
    (req.session as any).userId = user.userId;
    (req.session as any).email = user.email;
    (req.session as any).phoneNumber = user.phoneNumber;
    (req.session as any).firstName = user.firstName;
    (req.session as any).lastName = user.lastName;

    res.json({
      success: true,
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
 * Logout user
 */
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    req.session.destroy((err) => {
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
});

export default router;
