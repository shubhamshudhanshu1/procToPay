import { configService } from './configService';

/**
 * SMS Service
 *
 * Handles SMS delivery for OTP codes.
 * Supports Twilio in production and console logging for development.
 */
class SMSService {
  private twilioClient: any = null;
  private twilioPhoneNumber: string | null = null;
  private smsEnabled: boolean = false;

  constructor() {
    // Initialize Twilio if credentials are available
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
      try {
        // Dynamically import Twilio (optional dependency)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        this.twilioClient = twilio(twilioAccountSid, twilioAuthToken);
        this.twilioPhoneNumber = twilioPhoneNumber;
        this.smsEnabled = true;
      } catch (error) {
        console.warn('Twilio not installed. Install with: npm install twilio');
        console.warn('SMS will be logged to console in development mode.');
      }
    }
  }

  /**
   * Send OTP via SMS
   *
   * @param phoneNumber Recipient phone number (E.164 format)
   * @param otp OTP code to send
   * @returns Promise<void>
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    // Check if SMS is enabled in config
    const featureFlags = await configService.getFeatureFlags();
    if (!featureFlags.smsEnabled && !this.smsEnabled) {
      throw new Error('SMS service is not enabled');
    }

    // Get OTP config for expiry time
    const otpConfig = await configService.getOTPConfig();
    const expiresInMinutes = Math.floor(otpConfig.expirySeconds / 60);

    const message = `Your verification code is: ${otp}. This code will expire in ${expiresInMinutes} minutes.`;

    if (this.smsEnabled && this.twilioClient && this.twilioPhoneNumber) {
      // Send via Twilio
      try {
        await this.twilioClient.messages.create({
          body: message,
          from: this.twilioPhoneNumber,
          to: phoneNumber,
        });
      } catch (error: any) {
        console.error('Failed to send SMS via Twilio:', error);
        throw new Error(`Failed to send SMS: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Development mode: log to console
      console.log('='.repeat(60));
      console.log('📱 SMS (Development Mode)');
      console.log('='.repeat(60));
      console.log(`To: ${phoneNumber}`);
      console.log(`Message: ${message}`);
      console.log('='.repeat(60));
      // In development, we don't throw an error - just log it
    }
  }

  /**
   * Check if SMS service is available
   *
   * @returns boolean
   */
  isAvailable(): boolean {
    return this.smsEnabled || process.env.NODE_ENV === 'development';
  }
}

// Export singleton instance
export const smsService = new SMSService();

export default smsService;

