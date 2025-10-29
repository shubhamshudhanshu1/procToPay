import nodemailer from 'nodemailer';
import { env } from '../config/env';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

class Mailer {
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
      // Use local SMTP for development
      this.transporter = nodemailer.createTransport({
        // In Docker, use the service name so the app container can reach MailHog
        host: 'mailhog',
        port: 1025,
        secure: false,
      });
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.MAIL_FROM,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendOTPEmail(email: string, otp: string, expiresInMinutes: number): Promise<void> {
    const subject = 'Your login code';
    const text = `Your login code is: ${otp}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your login code</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your login code</h2>
          <p>Your login code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 2px; margin: 20px 0;">
            ${otp}
          </div>
          <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this code, please ignore this email.
          </p>
        </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, text, html });
  }

  async sendMagicLinkEmail(
    email: string,
    magicLink: string,
    expiresInMinutes: number
  ): Promise<void> {
    const subject = 'Your magic login link';
    const text = `Click the link below to log in:\n\n${magicLink}\n\nThis link will expire in ${expiresInMinutes} minutes.\n\nIf you didn't request this link, please ignore this email.`;
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Your magic login link</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Your magic login link</h2>
          <p>Click the button below to log in:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Log In
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${magicLink}</p>
          <p>This link will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this link, please ignore this email.
          </p>
        </body>
      </html>
    `;

    await this.sendEmail({ to: email, subject, text, html });
  }
}

export const mailer = new Mailer();
export default mailer;
