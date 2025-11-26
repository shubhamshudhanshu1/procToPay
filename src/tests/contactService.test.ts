import { describe, it, expect, beforeEach } from 'vitest';
import { contactService } from '../services/contactService';

describe('ContactService', () => {
  describe('normalizeEmail', () => {
    it('should lowercase and trim email', () => {
      expect(contactService.normalizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should remove extra spaces', () => {
      expect(contactService.normalizeEmail('test @ example . com')).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      expect(contactService.normalizeEmail('')).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(contactService.validateEmail('user@example.com')).toBe(true);
      expect(contactService.validateEmail('test.email+tag@example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(contactService.validateEmail('invalid')).toBe(false);
      expect(contactService.validateEmail('@example.com')).toBe(false);
      expect(contactService.validateEmail('user@')).toBe(false);
      expect(contactService.validateEmail('user..name@example.com')).toBe(false);
      expect(contactService.validateEmail('user@example')).toBe(false);
    });

    it('should reject emails with local part > 64 chars', () => {
      const longLocalPart = 'a'.repeat(65) + '@example.com';
      expect(contactService.validateEmail(longLocalPart)).toBe(false);
    });
  });

  describe('normalizePhone', () => {
    it('should normalize 10-digit US number', async () => {
      const normalized = await contactService.normalizePhone('1234567890');
      expect(normalized).toBe('+11234567890');
    });

    it('should handle number with country code', async () => {
      const normalized = await contactService.normalizePhone('+11234567890');
      expect(normalized).toBe('+11234567890');
    });

    it('should handle number with spaces and dashes', async () => {
      const normalized = await contactService.normalizePhone('(123) 456-7890');
      expect(normalized).toBe('+11234567890');
    });

    it('should handle 11-digit number starting with 1', async () => {
      const normalized = await contactService.normalizePhone('11234567890');
      expect(normalized).toBe('+11234567890');
    });

    it('should handle empty string', async () => {
      const normalized = await contactService.normalizePhone('');
      expect(normalized).toBe('');
    });
  });

  describe('validatePhone', () => {
    it('should validate correct phone numbers', async () => {
      expect(await contactService.validatePhone('+11234567890')).toBe(true);
      expect(await contactService.validatePhone('+441234567890')).toBe(true);
    });

    it('should reject invalid phone numbers', async () => {
      expect(await contactService.validatePhone('123')).toBe(false);
      expect(await contactService.validatePhone('1234567890123456')).toBe(false); // > 15 digits
      expect(await contactService.validatePhone('abc123')).toBe(false);
      expect(await contactService.validatePhone('123456789')).toBe(false); // < 10 digits
    });
  });

  describe('detectContactType', () => {
    it('should detect email', () => {
      expect(contactService.detectContactType('user@example.com')).toBe('email');
      expect(contactService.detectContactType('test.email@domain.co.uk')).toBe('email');
    });

    it('should detect phone', () => {
      expect(contactService.detectContactType('1234567890')).toBe('phone');
      expect(contactService.detectContactType('+11234567890')).toBe('phone');
      expect(contactService.detectContactType('(123) 456-7890')).toBe('phone');
    });

    it('should return null for invalid input', () => {
      expect(contactService.detectContactType('')).toBe(null);
      expect(contactService.detectContactType('invalid')).toBe(null);
      expect(contactService.detectContactType('123')).toBe(null); // Too short
    });
  });

  describe('normalizeAndValidate', () => {
    it('should normalize and validate email', async () => {
      const result = await contactService.normalizeAndValidate('  TEST@EXAMPLE.COM  ');
      expect(result.type).toBe('email');
      expect(result.normalized).toBe('test@example.com');
      expect(result.valid).toBe(true);
    });

    it('should normalize and validate phone', async () => {
      const result = await contactService.normalizeAndValidate('1234567890');
      expect(result.type).toBe('phone');
      expect(result.normalized).toBe('+11234567890');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for bad input', async () => {
      const result = await contactService.normalizeAndValidate('invalid');
      expect(result.type).toBe(null);
      expect(result.valid).toBe(false);
    });
  });
});

