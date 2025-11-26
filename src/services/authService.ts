import { prisma } from '../db/prisma';
import { contactService } from './contactService';
import { otpService } from './otpService';
import { rateLimiterService } from './rateLimiterService';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { configService } from './configService';
import { hashIP, hashUA } from '../lib/crypto';

/**
 * Authentication Service
 *
 * Handles complete authentication flows including login, registration, and OTP verification.
 * Integrates all services: Contact, OTP, Rate Limiting, Email, SMS.
 */
class AuthService {
  /**
   * Request OTP for login (existing user)
   *
   * @param contact Contact (email or phone)
   * @param ipAddress IP address
   * @param userAgent User agent
   * @returns Result with contact type and normalized contact
   */
  async requestOTP(
    contact: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    contactType: 'email' | 'phone';
    normalizedContact: string;
  }> {
    // Detect contact type
    const contactType = contactService.detectContactType(contact);
    if (!contactType) {
      throw new Error('Invalid contact. Must be a valid email or phone number.');
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Validate contact
    const isValid =
      contactType === 'email'
        ? contactService.validateEmail(normalizedContact)
        : await contactService.validatePhone(normalizedContact);

    if (!isValid) {
      throw new Error(`Invalid ${contactType} address.`);
    }

    // Check feature flags
    const featureFlags = await configService.getFeatureFlags();
    if (!featureFlags.loginEnabled) {
      throw new Error('Login is currently disabled.');
    }

    const contactConfig = await configService.getContactConfig();
    if (contactType === 'email' && !contactConfig.emailEnabled) {
      throw new Error('Email authentication is disabled.');
    }
    if (contactType === 'phone' && !contactConfig.phoneEnabled) {
      throw new Error('Phone authentication is disabled.');
    }

    // Check rate limits
    const otpLimit = await rateLimiterService.checkOTPRequestLimit(
      normalizedContact,
      contactType
    );
    if (!otpLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Please try again in ${otpLimit.retryAfter} seconds.`
      );
    }

    const resendCheck = await rateLimiterService.checkResendTimer(
      normalizedContact,
      contactType
    );
    if (!resendCheck.allowed) {
      throw new Error(
        `Please wait ${resendCheck.retryAfter} seconds before requesting a new code.`
      );
    }

    // Check IP rate limit
    if (ipAddress) {
      const ipLimit = await rateLimiterService.checkIPLimit(ipAddress);
      if (!ipLimit.allowed) {
        throw new Error('Too many requests from this IP address. Please try again later.');
      }
    }

    // Check if user exists
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: contactType === 'email' ? normalizedContact : undefined },
          { phoneNumber: contactType === 'phone' ? normalizedContact : undefined },
        ],
      },
    });

    if (!user) {
      // Don't reveal if user exists (security best practice)
      // Still generate OTP to prevent user enumeration
    }

    // Generate OTP
    const otp = await otpService.generateOTP(normalizedContact, contactType, ipAddress, userAgent);

    // Send OTP
    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, otp);
    } else {
      if (!smsService.isAvailable()) {
        throw new Error('SMS service is not available.');
      }
      await smsService.sendOTP(normalizedContact, otp);
    }

    return {
      contactType,
      normalizedContact,
    };
  }

  /**
   * Verify OTP for login
   *
   * @param contact Contact (email or phone)
   * @param otp OTP code
   * @returns User ID and session data
   */
  async verifyOTP(contact: string, otp: string): Promise<{
    userId: string;
    email?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
  }> {
    // Detect contact type
    const contactType = contactService.detectContactType(contact);
    if (!contactType) {
      throw new Error('Invalid contact. Must be a valid email or phone number.');
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Check verification rate limit
    const verifyLimit = await rateLimiterService.checkVerifyLimit(
      normalizedContact,
      contactType
    );
    if (!verifyLimit.allowed) {
      throw new Error(
        `Too many verification attempts. Please try again in ${verifyLimit.retryAfter} seconds.`
      );
    }

    // Verify OTP
    const verifyResult = await otpService.verifyOTP(normalizedContact, contactType, otp);

    if (!verifyResult.valid) {
      if (verifyResult.reason === 'max_attempts') {
        throw new Error('Maximum verification attempts exceeded. Please request a new code.');
      }
      if (verifyResult.reason === 'expired') {
        throw new Error('OTP has expired. Please request a new code.');
      }
      if (verifyResult.reason === 'already_used') {
        throw new Error('This code has already been used. Please request a new code.');
      }
      throw new Error(
        `Invalid code. ${verifyResult.attemptsRemaining !== undefined ? `${verifyResult.attemptsRemaining} attempts remaining.` : ''}`
      );
    }

    // Find or create user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: contactType === 'email' ? normalizedContact : undefined },
          { phoneNumber: contactType === 'phone' ? normalizedContact : undefined },
        ],
      },
    });

    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    // Update verification timestamp
    const updateData: any = {};
    if (contactType === 'email') {
      updateData.emailVerifiedAt = new Date();
    } else {
      updateData.phoneVerifiedAt = new Date();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return {
      userId: user.id,
      email: user.email || undefined,
      phoneNumber: user.phoneNumber || undefined,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  /**
   * Register new user
   *
   * @param firstName First name
   * @param lastName Last name
   * @param email Email (optional)
   * @param phoneNumber Phone number (optional)
   * @param ipAddress IP address
   * @param userAgent User agent
   * @returns Result with contact type and normalized contact
   */
  async register(
    firstName: string,
    lastName: string,
    email?: string,
    phoneNumber?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    contactType: 'email' | 'phone';
    normalizedContact: string;
    userId: string;
  }> {
    // Check feature flags
    const featureFlags = await configService.getFeatureFlags();
    if (!featureFlags.registrationEnabled) {
      throw new Error('Registration is currently disabled.');
    }

    // Validate at least one contact method
    if (!email && !phoneNumber) {
      throw new Error('Either email or phone number is required.');
    }

    // Normalize and validate contacts
    let normalizedEmail: string | undefined;
    let normalizedPhone: string | undefined;

    if (email) {
      normalizedEmail = contactService.normalizeEmail(email);
      if (!contactService.validateEmail(normalizedEmail)) {
        throw new Error('Invalid email address.');
      }
    }

    if (phoneNumber) {
      normalizedPhone = await contactService.normalizePhone(phoneNumber);
      if (!(await contactService.validatePhone(normalizedPhone))) {
        throw new Error('Invalid phone number.');
      }
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phoneNumber: normalizedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or phone number already exists.');
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
      },
    });

    // Determine which contact to use for OTP (prefer email)
    const contactType: 'email' | 'phone' = normalizedEmail ? 'email' : 'phone';
    const normalizedContact = normalizedEmail || normalizedPhone!;

    // Check rate limits
    const otpLimit = await rateLimiterService.checkOTPRequestLimit(
      normalizedContact,
      contactType
    );
    if (!otpLimit.allowed) {
      throw new Error(
        `Rate limit exceeded. Please try again in ${otpLimit.retryAfter} seconds.`
      );
    }

    const resendCheck = await rateLimiterService.checkResendTimer(
      normalizedContact,
      contactType
    );
    if (!resendCheck.allowed) {
      throw new Error(
        `Please wait ${resendCheck.retryAfter} seconds before requesting a new code.`
      );
    }

    // Check IP rate limit
    if (ipAddress) {
      const ipLimit = await rateLimiterService.checkIPLimit(ipAddress);
      if (!ipLimit.allowed) {
        throw new Error('Too many requests from this IP address. Please try again later.');
      }
    }

    // Generate OTP
    const otp = await otpService.generateOTP(normalizedContact, contactType, ipAddress, userAgent);

    // Send OTP
    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, otp);
    } else {
      if (!smsService.isAvailable()) {
        throw new Error('SMS service is not available.');
      }
      await smsService.sendOTP(normalizedContact, otp);
    }

    return {
      contactType,
      normalizedContact,
      userId: user.id,
    };
  }

  /**
   * Verify OTP for registration
   *
   * @param userId User ID
   * @param contact Contact (email or phone)
   * @param otp OTP code
   * @returns User data
   */
  async verifyRegistrationOTP(
    userId: string,
    contact: string,
    otp: string
  ): Promise<{
    userId: string;
    email?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
  }> {
    // Detect contact type
    const contactType = contactService.detectContactType(contact);
    if (!contactType) {
      throw new Error('Invalid contact. Must be a valid email or phone number.');
    }

    // Normalize contact
    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    // Check verification rate limit
    const verifyLimit = await rateLimiterService.checkVerifyLimit(
      normalizedContact,
      contactType
    );
    if (!verifyLimit.allowed) {
      throw new Error(
        `Too many verification attempts. Please try again in ${verifyLimit.retryAfter} seconds.`
      );
    }

    // Verify OTP
    const verifyResult = await otpService.verifyOTP(normalizedContact, contactType, otp);

    if (!verifyResult.valid) {
      if (verifyResult.reason === 'max_attempts') {
        throw new Error('Maximum verification attempts exceeded. Please request a new code.');
      }
      if (verifyResult.reason === 'expired') {
        throw new Error('OTP has expired. Please request a new code.');
      }
      if (verifyResult.reason === 'already_used') {
        throw new Error('This code has already been used. Please request a new code.');
      }
      throw new Error(
        `Invalid code. ${verifyResult.attemptsRemaining !== undefined ? `${verifyResult.attemptsRemaining} attempts remaining.` : ''}`
      );
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    // Verify contact matches user
    if (contactType === 'email' && user.email !== normalizedContact) {
      throw new Error('Email does not match user account.');
    }
    if (contactType === 'phone' && user.phoneNumber !== normalizedContact) {
      throw new Error('Phone number does not match user account.');
    }

    // Update verification timestamp
    const updateData: any = {};
    if (contactType === 'email') {
      updateData.emailVerifiedAt = new Date();
    } else {
      updateData.phoneVerifiedAt = new Date();
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return {
      userId: user.id,
      email: user.email || undefined,
      phoneNumber: user.phoneNumber || undefined,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  /**
   * Create session for authenticated user
   *
   * @param userId User ID
   * @param sessionId Express session ID
   * @param ipAddress IP address
   * @param userAgent User agent
   */
  async createSession(
    userId: string,
    sessionId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Session is managed by express-session middleware
    // We just need to store user ID in session
    // This method is a placeholder for future session tracking in database if needed
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;

