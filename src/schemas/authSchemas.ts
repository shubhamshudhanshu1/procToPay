import { z } from 'zod';

/**
 * Validation schemas for authentication endpoints
 */

// Login request schema - accepts email or phone
export const loginRequestSchema = z.object({
  contact: z.string().min(1, 'Contact is required'),
});

// Login verify schema
export const loginVerifySchema = z.object({
  contact: z.string().min(1, 'Contact is required'),
  otp: z.string().min(4).max(8, 'OTP must be 4-8 digits'),
});

// Registration schema - both email and phone are required
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
});

// Registration verify schema
export const registerVerifySchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  contact: z.string().min(1, 'Contact is required'),
  otp: z.string().min(4).max(8, 'OTP must be 4-8 digits'),
});

// Logout schema (no body needed, but keeping for consistency)
export const logoutSchema = z.object({});

export type LoginRequestInput = z.infer<typeof loginRequestSchema>;
export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterVerifyInput = z.infer<typeof registerVerifySchema>;
