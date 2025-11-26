import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { configService } from './configService';

/**
 * Email Service
 *
 * Handles email delivery for OTP codes and other notifications.
 * Supports SendGrid in production and MailHog for development.
 */
class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    if (env.SENDGRID_API_KEY) {
      // Use SendGrid
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: env.SENDGRID_API_KEY,
        },
      });
    } else {
      // Use local SMTP for development (MailHog)
      this.transporter = nodemailer.createTransport({
        host: process.env.MAILHOG_HOST || 'mailhog',
        port: parseInt(process.env.MAILHOG_PORT || '1025', 10),
        secure: false,
      });
    }
  }

  /**
   * Send OTP email
   *
   * @param email Recipient email address
   * @param otp OTP code to send
   * @returns Promise<void>
   */
  async sendOTP(email: string, otp: string): Promise<void> {
    // Get OTP config for expiry time
    const otpConfig = await configService.getOTPConfig();
    const expiresInMinutes = Math.floor(otpConfig.expirySeconds / 60);

    const subject = 'Your verification code';
    const text = `Your verification code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your verification code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #333; margin-top: 0;">Your verification code</h2>
            <p style="color: #666; font-size: 16px;">Use the code below to verify your account:</p>
            <div style="background-color: #f8f9fa; padding: 24px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 30px 0; border-radius: 6px; border: 2px dashed #dee2e6;">
              ${otp}
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in <strong>${expiresInMinutes} minutes</strong>.
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you didn't request this code, please ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to: email,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Send generic email
   *
   * @param to Recipient email address
   * @param subject Email subject
   * @param text Plain text content
   * @param html HTML content
   * @returns Promise<void>
   */
  async sendEmail(to: string, subject: string, text: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        text,
        html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

export default emailService;

