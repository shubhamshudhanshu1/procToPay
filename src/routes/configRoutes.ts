import { Router, Request, Response } from 'express';
import { configService } from '../services/configService';

const router: Router = Router();

/**
 * GET /api/config
 * Get public application configuration
 * Returns configuration values needed by the frontend (no authentication required)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const otpConfig = await configService.getOTPConfig();

    res.json({
      success: true,
      config: {
        otp: {
          length: otpConfig.length,
          // Don't expose sensitive config like hardcodedEnabled, maxAttempts, etc.
        },
      },
    });
  } catch (error: any) {
    console.error('Failed to get app config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load application configuration',
    });
  }
});

export default router;
