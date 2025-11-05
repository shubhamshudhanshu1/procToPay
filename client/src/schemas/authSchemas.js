import { z } from 'zod';

// Schema for email or phone validation
const emailOrPhoneSchema = z.string().refine(
  (val) => {
    if (!val) return false;
    // Check if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(val.trim())) return true;
    // Check if it's a phone number (7-15 digits, optionally starting with +)
    const cleaned = val.trim().replace(/[^\d+]/g, '');
    const digitsOnly = cleaned.replace(/\+/g, '');
    return (
      /^\+?\d{7,15}$/.test(cleaned) &&
      digitsOnly.length >= 7 &&
      digitsOnly.length <= 15 &&
      !val.includes('@')
    );
  },
  {
    message: 'Please enter a valid email address or phone number',
  }
);

export const loginSchema = z.object({
  email: emailOrPhoneSchema,
  // Keep as 'email' for backward compatibility with backend, but accepts both
});

// Phone validation schema (optional, but validates if provided)
const phoneSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Optional, so empty is valid
      const cleaned = val.trim().replace(/[^\d+]/g, '');
      const digitsOnly = cleaned.replace(/\+/g, '');
      return (
        /^\+?\d{10,15}$/.test(cleaned) &&
        digitsOnly.length >= 10 &&
        digitsOnly.length <= 15 &&
        !val.includes('@')
      );
    },
    {
      message: 'Please enter a valid phone number (10-15 digits)',
    }
  );

// Email validation schema (optional, but validates if provided)
const emailSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true; // Optional, so empty is valid
      return z.string().email().safeParse(val).success;
    },
    {
      message: 'Invalid email address',
    }
  );

export const registerSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phoneNumber: phoneSchema,
    email: emailSchema,
  })
  .refine(
    (data) => {
      const hasPhone = data.phoneNumber && data.phoneNumber.trim() !== '';
      const hasEmail = data.email && data.email.trim() !== '';
      return hasPhone || hasEmail;
    },
    {
      message: 'Please provide either a phone number or email address',
      path: ['phoneNumber'], // Show error on phoneNumber field
    }
  )
  .refine(
    (data) => {
      const hasPhone = data.phoneNumber && data.phoneNumber.trim() !== '';
      const hasEmail = data.email && data.email.trim() !== '';
      return hasPhone || hasEmail;
    },
    {
      message: 'Please provide either a phone number or email address',
      path: ['email'], // Also show error on email field
    }
  );

export const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
});
