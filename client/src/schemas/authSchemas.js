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

// Phone validation schema (required)
const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .refine(
    (val) => {
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

// Email validation schema (required)
const emailSchema = z
  .string()
  .min(1, 'Email address is required')
  .email('Invalid email address');

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: phoneSchema,
  email: emailSchema,
});

export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
});
