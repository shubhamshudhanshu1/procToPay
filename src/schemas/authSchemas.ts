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

// Registration schema
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email().optional().or(z.literal('')),
  phoneNumber: z.string().optional().or(z.literal('')),
}).refine(
  (data) => {
    const hasEmail = data.email && data.email.trim() !== '';
    const hasPhone = data.phoneNumber && data.phoneNumber.trim() !== '';
    return hasEmail || hasPhone;
  },
  {
    message: 'Either email or phone number is required',
    path: ['email'],
  }
).refine(
  (data) => {
    const hasEmail = data.email && data.email.trim() !== '';
    const hasPhone = data.phoneNumber && data.phoneNumber.trim() !== '';
    return hasEmail || hasPhone;
  },
  {
    message: 'Either email or phone number is required',
    path: ['phoneNumber'],
  }
);

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

