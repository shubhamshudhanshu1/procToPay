import { prisma } from '../db/prisma';
import { contactService } from './contactService';
import { otpService } from './otpService';
import { rateLimiterService } from './rateLimiterService';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { configService } from './configService';

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
    const otpLimit = await rateLimiterService.checkOTPRequestLimit(normalizedContact, contactType);
    if (!otpLimit.allowed) {
      throw new Error(`Rate limit exceeded. Please try again in ${otpLimit.retryAfter} seconds.`);
    }

    const resendCheck = await rateLimiterService.checkResendTimer(normalizedContact, contactType);
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
    const orConditions: Array<{ email?: string } | { phoneNumber?: string }> = [];
    if (contactType === 'email') {
      orConditions.push({ email: normalizedContact });
    } else {
      orConditions.push({ phoneNumber: normalizedContact });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
      },
    });

    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    // Check if user is active (verified) - pending users should complete registration first
    if (user.status === 'pending') {
      throw new Error('Your account is pending verification. Please complete registration first.');
    }

    // Check if the requested contact method is verified
    if (contactType === 'email') {
      if (!user.emailVerifiedAt) {
        throw new Error('Email is not verified. Please login with your phone number.');
      }
    } else {
      if (!user.phoneVerifiedAt) {
        throw new Error('Phone number is not verified. Please login with your email.');
      }
    }

    // Get OTP config to check if hardcoded OTP is enabled
    const otpConfig = await configService.getOTPConfig();

    // Generate OTP
    const otp = await otpService.generateOTP(normalizedContact, contactType, ipAddress, userAgent);

    // Send OTP
    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, otp);
    } else {
      // Skip SMS if hardcoded OTP is enabled (OTP is already known - last N digits of phone)
      if (!otpConfig.hardcodedEnabled) {
        if (!smsService.isAvailable()) {
          throw new Error('SMS service is not available.');
        }
        await smsService.sendOTP(normalizedContact, otp);
      } else {
        // Hardcoded OTP enabled - log to console for development
        console.log('='.repeat(60));
        console.log('📱 Hardcoded OTP (Phone)');
        console.log('='.repeat(60));
        console.log(`Phone: ${normalizedContact}`);
        console.log(`OTP: ${otp} (last ${otpConfig.length} digits of phone)`);
        console.log('='.repeat(60));
      }
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
  async verifyOTP(
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
    const verifyLimit = await rateLimiterService.checkVerifyLimit(normalizedContact, contactType);
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
    const orConditions: Array<{ email?: string } | { phoneNumber?: string }> = [];
    if (contactType === 'email') {
      orConditions.push({ email: normalizedContact });
    } else {
      orConditions.push({ phoneNumber: normalizedContact });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: orConditions,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
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

    // If user is pending and now has at least one verified channel, activate them
    if (user.status === 'pending') {
      const hasEmailVerified = contactType === 'email' || user.emailVerifiedAt;
      const hasPhoneVerified = contactType === 'phone' || user.phoneVerifiedAt;

      if (hasEmailVerified || hasPhoneVerified) {
        updateData.status = 'active'; // Activate user after first verification
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    const result: {
      userId: string;
      email?: string;
      phoneNumber?: string;
      firstName: string;
      lastName: string;
    } = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    if (user.email) {
      result.email = user.email;
    }
    if (user.phoneNumber) {
      result.phoneNumber = user.phoneNumber;
    }
    return result;
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
    email: string,
    phoneNumber: string,
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

    // Validate both contact methods are provided
    if (!email || !phoneNumber) {
      throw new Error('Both email and phone number are required.');
    }

    // Normalize and validate contacts (both are required)
    const normalizedEmail = contactService.normalizeEmail(email);
    if (!contactService.validateEmail(normalizedEmail)) {
      throw new Error('Invalid email address.');
    }

    const normalizedPhone = await contactService.normalizePhone(phoneNumber);
    if (!(await contactService.validatePhone(normalizedPhone))) {
      throw new Error('Invalid phone number.');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phoneNumber: normalizedPhone }],
      },
    });

    let user;
    if (existingUser) {
      // If user exists but is pending (not verified), allow re-registration
      // This handles the case where user started registration but didn't complete verification
      if (
        existingUser.status === 'pending' &&
        !existingUser.emailVerifiedAt &&
        !existingUser.phoneVerifiedAt
      ) {
        // Update existing pending user with new registration data
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            email: normalizedEmail,
            phoneNumber: normalizedPhone,
            emailVerifiedAt: null, // Reset verification
            phoneVerifiedAt: null, // Reset verification
            status: 'pending', // Ensure status is pending
          },
        });
      } else {
        // User exists and is verified/active, cannot register again
        throw new Error('User with this email or phone number already exists.');
      }
    } else {
      // Create new user with pending status (will be activated after verification)
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phoneNumber: normalizedPhone,
          status: 'pending', // Start as pending until verification
        },
      });
    }

    // Determine which contact to use for OTP (prefer email)
    const contactType: 'email' | 'phone' = normalizedEmail ? 'email' : 'phone';
    const normalizedContact = normalizedEmail || normalizedPhone!;

    // Check rate limits
    const otpLimit = await rateLimiterService.checkOTPRequestLimit(normalizedContact, contactType);
    if (!otpLimit.allowed) {
      throw new Error(`Rate limit exceeded. Please try again in ${otpLimit.retryAfter} seconds.`);
    }

    const resendCheck = await rateLimiterService.checkResendTimer(normalizedContact, contactType);
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

    // Get OTP config to check if hardcoded OTP is enabled
    const otpConfig = await configService.getOTPConfig();

    // Generate OTP
    const otp = await otpService.generateOTP(normalizedContact, contactType, ipAddress, userAgent);

    // Send OTP
    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, otp);
    } else {
      // Skip SMS if hardcoded OTP is enabled (OTP is already known - last N digits of phone)
      if (!otpConfig.hardcodedEnabled) {
        if (!smsService.isAvailable()) {
          throw new Error('SMS service is not available.');
        }
        await smsService.sendOTP(normalizedContact, otp);
      } else {
        // Hardcoded OTP enabled - log to console for development
        console.log('='.repeat(60));
        console.log('📱 Hardcoded OTP (Phone)');
        console.log('='.repeat(60));
        console.log(`Phone: ${normalizedContact}`);
        console.log(`OTP: ${otp} (last ${otpConfig.length} digits of phone)`);
        console.log('='.repeat(60));
      }
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
    const verifyLimit = await rateLimiterService.checkVerifyLimit(normalizedContact, contactType);
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

    const result: {
      userId: string;
      email?: string;
      phoneNumber?: string;
      firstName: string;
      lastName: string;
    } = {
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    if (user.email) {
      result.email = user.email;
    }
    if (user.phoneNumber) {
      result.phoneNumber = user.phoneNumber;
    }
    return result;
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
    _userId: string,
    _sessionId: string,
    _ipAddress?: string,
    _userAgent?: string
  ): Promise<void> {
    // Session is managed by express-session middleware
    // We just need to store user ID in session
    // This method is a placeholder for future session tracking in database if needed
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
