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
  // ============================================
  // PRIVATE HELPER METHODS (DRY - Don't Repeat Yourself)
  // ============================================

  /**
   * Process and validate a contact (detect type, normalize, validate)
   */
  private async processContact(contact: string): Promise<{
    contactType: 'email' | 'phone';
    normalizedContact: string;
  }> {
    const contactType = contactService.detectContactType(contact);
    if (!contactType) {
      throw new Error('Invalid contact. Must be a valid email or phone number.');
    }

    const normalizedContact =
      contactType === 'email'
        ? contactService.normalizeEmail(contact)
        : await contactService.normalizePhone(contact);

    const isValid =
      contactType === 'email'
        ? contactService.validateEmail(normalizedContact)
        : await contactService.validatePhone(normalizedContact);

    if (!isValid) {
      throw new Error(`Invalid ${contactType} address.`);
    }

    return { contactType, normalizedContact };
  }

  /**
   * Check feature flags for authentication flow
   */
  private async checkFeatureFlags(flow: 'login' | 'registration'): Promise<void> {
    const featureFlags = await configService.getFeatureFlags();
    if (flow === 'login' && !featureFlags.loginEnabled) {
      throw new Error('Login is currently disabled.');
    }
    if (flow === 'registration' && !featureFlags.registrationEnabled) {
      throw new Error('Registration is currently disabled.');
    }
  }

  /**
   * Check if contact method is enabled in config
   */
  private async checkContactEnabled(contactType: 'email' | 'phone'): Promise<void> {
    const contactConfig = await configService.getContactConfig();
    if (contactType === 'email' && !contactConfig.emailEnabled) {
      throw new Error('Email authentication is disabled.');
    }
    if (contactType === 'phone' && !contactConfig.phoneEnabled) {
      throw new Error('Phone authentication is disabled.');
    }
  }

  /**
   * Check all rate limits for OTP request
   */
  private async checkRateLimits(
    normalizedContact: string,
    contactType: 'email' | 'phone',
    ipAddress?: string
  ): Promise<void> {
    // Check OTP request rate limit
    const otpLimit = await rateLimiterService.checkOTPRequestLimit(normalizedContact, contactType);
    if (!otpLimit.allowed) {
      throw new Error(`Rate limit exceeded. Please try again in ${otpLimit.retryAfter} seconds.`);
    }

    // Check resend timer
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
  }

  /**
   * Generate and send OTP to a contact (handles email/SMS and hardcoded OTP)
   */
  private async generateAndSendOTP(
    normalizedContact: string,
    contactType: 'email' | 'phone',
    ipAddress?: string,
    userAgent?: string,
    context?: string
  ): Promise<void> {
    const otpConfig = await configService.getOTPConfig();
    const otp = await otpService.generateOTP(normalizedContact, contactType, ipAddress, userAgent);

    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, otp);
    } else {
      // Handle phone OTP (SMS or hardcoded)
      if (!otpConfig.hardcodedEnabled) {
        if (!smsService.isAvailable()) {
          throw new Error('SMS service is not available.');
        }
        await smsService.sendOTP(normalizedContact, otp);
      } else {
        // Hardcoded OTP enabled - log to console for development
        const contextLabel = context ? ` - ${context}` : '';
        console.log('='.repeat(60));
        console.log(`📱 Hardcoded OTP (Phone)${contextLabel}`);
        console.log('='.repeat(60));
        console.log(`Phone: ${normalizedContact}`);
        console.log(`OTP: ${otp} (last ${otpConfig.length} digits of phone)`);
        console.log('='.repeat(60));
      }
    }
  }

  /**
   * Find user by contact (email or phone) - full user data
   */
  private async findUserByContact(normalizedContact: string, contactType: 'email' | 'phone') {
    const orConditions: Array<{ email?: string } | { phoneNumber?: string }> = [];
    if (contactType === 'email') {
      orConditions.push({ email: normalizedContact });
    } else {
      orConditions.push({ phoneNumber: normalizedContact });
    }

    return await prisma.user.findFirst({
      where: { OR: orConditions },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        status: true,
        firstName: true,
        lastName: true,
      },
    });
  }

  /**
   * Find user by contact with verification status fields
   */
  private async findUserByContactWithVerification(
    normalizedContact: string,
    contactType: 'email' | 'phone'
  ) {
    const orConditions: Array<{ email?: string } | { phoneNumber?: string }> = [];
    if (contactType === 'email') {
      orConditions.push({ email: normalizedContact });
    } else {
      orConditions.push({ phoneNumber: normalizedContact });
    }

    return await prisma.user.findFirst({
      where: { OR: orConditions },
      select: {
        id: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
  }

  /**
   * Handle OTP verification errors with user-friendly messages
   */
  private handleOTPVerificationError(verifyResult: {
    valid: boolean;
    reason?: 'invalid' | 'expired' | 'max_attempts' | 'already_used';
    attemptsRemaining?: number;
  }): never {
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

  /**
   * Update user verification timestamp based on contact type
   */
  private async updateVerificationTimestamp(
    userId: string,
    contactType: 'email' | 'phone'
  ): Promise<void> {
    const updateData: any = {};
    if (contactType === 'email') {
      updateData.emailVerifiedAt = new Date();
    } else {
      updateData.phoneVerifiedAt = new Date();
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * Build user result object from user data
   */
  private buildUserResult(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email?: string | null;
    phoneNumber?: string | null;
  }): {
    userId: string;
    email?: string;
    phoneNumber?: string;
    firstName: string;
    lastName: string;
  } {
    if (!user.firstName || !user.lastName) {
      throw new Error('User missing required name fields');
    }

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

  // ============================================
  // PUBLIC API METHODS
  // ============================================

  /**
   * Request OTP for login (existing user)
   */
  async requestOTP(
    contact: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    contactType: 'email' | 'phone';
    normalizedContact: string;
  }> {
    // Process contact
    const { contactType, normalizedContact } = await this.processContact(contact);

    // Check feature flags and contact enabled
    await this.checkFeatureFlags('login');
    await this.checkContactEnabled(contactType);

    // Check rate limits
    await this.checkRateLimits(normalizedContact, contactType, ipAddress);

    // Find user and validate
    const user = await this.findUserByContact(normalizedContact, contactType);
    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    if (user.status === 'pending') {
      throw new Error('Your account is pending verification. Please complete registration first.');
    }

    // Verify contact method is verified
    if (contactType === 'email' && !user.emailVerifiedAt) {
      throw new Error('Email is not verified. Please login with your phone number.');
    }
    if (contactType === 'phone' && !user.phoneVerifiedAt) {
      throw new Error('Phone number is not verified. Please login with your email.');
    }

    // Generate and send OTP
    await this.generateAndSendOTP(normalizedContact, contactType, ipAddress, userAgent);

    return { contactType, normalizedContact };
  }

  /**
   * Verify OTP for login
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
    // Process contact
    const { contactType, normalizedContact } = await this.processContact(contact);

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
      this.handleOTPVerificationError(verifyResult);
    }

    // Find user
    const user = await this.findUserByContact(normalizedContact, contactType);

    if (!user) {
      throw new Error('User not found. Please register first.');
    }

    // Update verification timestamp
    await this.updateVerificationTimestamp(user.id, contactType);

    // Activate user if pending and now has at least one verified channel
    if (user.status === 'pending') {
      const hasEmailVerified = contactType === 'email' || user.emailVerifiedAt;
      const hasPhoneVerified = contactType === 'phone' || user.phoneVerifiedAt;

      if (hasEmailVerified || hasPhoneVerified) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: 'active' },
        });
      }
    }

    return this.buildUserResult(user);
  }

  /**
   * Register new user
   *
   * Creates a new user and sends OTPs to BOTH email and phone for verification.
   * User must verify both contacts to complete registration.
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
    await this.checkFeatureFlags('registration');

    // Validate both contact methods are provided
    if (!email || !phoneNumber) {
      throw new Error('Both email and phone number are required.');
    }

    // Process contacts
    const normalizedEmail = contactService.normalizeEmail(email);
    if (!contactService.validateEmail(normalizedEmail)) {
      throw new Error('Invalid email address.');
    }

    const normalizedPhone = await contactService.normalizePhone(phoneNumber);
    if (!(await contactService.validatePhone(normalizedPhone))) {
      throw new Error('Invalid phone number.');
    }

    // Check for duplicate email (separate check)
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Check for duplicate phone number (separate check)
    const existingUserByPhone = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    let user;

    // Handle duplicate detection - prevent all duplicates
    if (existingUserByEmail && existingUserByPhone) {
      // Both email and phone exist
      if (existingUserByEmail.id === existingUserByPhone.id) {
        // Same user - check if they can re-register (only if pending and not verified)
        if (
          existingUserByEmail.status === 'pending' &&
          !existingUserByEmail.emailVerifiedAt &&
          !existingUserByEmail.phoneVerifiedAt
        ) {
          // Allow re-registration for the same pending user who hasn't verified
          user = await prisma.user.update({
            where: { id: existingUserByEmail.id },
            data: {
              firstName,
              lastName,
              email: normalizedEmail,
              phoneNumber: normalizedPhone,
              emailVerifiedAt: null,
              phoneVerifiedAt: null,
              status: 'pending',
            },
          });
        } else {
          // User exists and is active or partially verified - prevent duplicate
          throw new Error('An account with this email and phone number already exists.');
        }
      } else {
        // Different users - email belongs to one user, phone to another
        throw new Error(
          'This email and phone number are already associated with different accounts.'
        );
      }
    } else if (existingUserByEmail) {
      // Email already exists - prevent duplicate email
      throw new Error('An account with this email address already exists.');
    } else if (existingUserByPhone) {
      // Phone number already exists - prevent duplicate phone
      throw new Error('An account with this phone number already exists.');
    } else {
      // No duplicates found, create new user
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          phoneNumber: normalizedPhone,
          status: 'pending',
        },
      });
    }

    // Check IP rate limit once for the registration request
    if (ipAddress) {
      const ipLimit = await rateLimiterService.checkIPLimit(ipAddress);
      if (!ipLimit.allowed) {
        throw new Error('Too many requests from this IP address. Please try again later.');
      }
    }

    // Check contact configs
    await this.checkContactEnabled('email');
    await this.checkContactEnabled('phone');

    // Send OTP to email
    await this.checkRateLimits(normalizedEmail, 'email', ipAddress);
    await this.generateAndSendOTP(normalizedEmail, 'email', ipAddress, userAgent);

    // Send OTP to phone
    await this.checkRateLimits(normalizedPhone, 'phone', ipAddress);
    await this.generateAndSendOTP(normalizedPhone, 'phone', ipAddress, userAgent);

    return {
      contactType: 'email' as const,
      normalizedContact: normalizedEmail,
      userId: user.id,
    };
  }

  /**
   * Verify OTP for registration
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
    // Process contact
    const { contactType, normalizedContact } = await this.processContact(contact);

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
      this.handleOTPVerificationError(verifyResult);
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
    await this.updateVerificationTimestamp(user.id, contactType);

    // Refresh user to get updated verification timestamps
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!updatedUser) {
      throw new Error('User not found after verification update.');
    }

    // Activate user if any contact method (email or phone) is verified
    if (
      updatedUser.status === 'pending' &&
      (updatedUser.emailVerifiedAt || updatedUser.phoneVerifiedAt)
    ) {
      await prisma.user.update({
        where: { id: updatedUser.id },
        data: { status: 'active' },
      });
    }

    return this.buildUserResult(updatedUser);
  }

  /**
   * Resend OTP for registration (for pending users only)
   */
  async resendRegistrationOTP(
    contact: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{
    contactType: 'email' | 'phone';
    normalizedContact: string;
  }> {
    // Process contact
    const { contactType, normalizedContact } = await this.processContact(contact);

    // Check feature flags and contact enabled
    await this.checkFeatureFlags('registration');
    await this.checkContactEnabled(contactType);

    // Check rate limits
    await this.checkRateLimits(normalizedContact, contactType, ipAddress);

    // Check if user exists and registration is still in progress
    // Get user with verification status to check registration progress
    const user = await this.findUserByContactWithVerification(normalizedContact, contactType);

    if (!user) {
      throw new Error('User not found. Please complete registration first.');
    }

    // Allow resending OTP if:
    // 1. User is still in registration flow (status = 'pending')
    // 2. OR both contacts aren't verified yet (registration not complete)
    const isRegistrationInProgress =
      user.status === 'pending' || !user.emailVerifiedAt || !user.phoneVerifiedAt;

    if (!isRegistrationInProgress) {
      throw new Error('Registration already completed. Please use login to request OTP.');
    }

    // Generate and send OTP
    await this.generateAndSendOTP(
      normalizedContact,
      contactType,
      ipAddress,
      userAgent,
      'Registration Resend'
    );

    return { contactType, normalizedContact };
  }

  /**
   * Create session for authenticated user
   */
  async createSession(
    _userId: string,
    _sessionId: string,
    _ipAddress?: string,
    _userAgent?: string
  ): Promise<void> {
    // Session is managed by express-session middleware
    // This method is a placeholder for future session tracking in database if needed
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;
