import { configService } from './configService';

/**
 * Contact Service
 *
 * Handles email and phone number normalization and validation.
 * Provides RFC 5322 compliant email validation and E.164 phone normalization.
 */
class ContactService {
  // RFC 5322 compliant email regex
  private readonly emailRegex =
    /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

  // E.164 format regex
  private readonly e164Regex = /^\+[1-9]\d{1,14}$/;

  /**
   * Normalize email address
   * - Trim whitespace
   * - Convert to lowercase
   * - Remove extra spaces
   *
   * @param email Raw email input
   * @returns Normalized email address
   */
  normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase().replace(/\s+/g, '');
  }

  /**
   * Validate email address (RFC 5322 compliant)
   *
   * @param email Email address to validate
   * @returns true if valid, false otherwise
   */
  validateEmail(email: string): boolean {
    const normalized = this.normalizeEmail(email);

    // Basic checks
    if (!normalized.includes('@')) return false;
    if (normalized.startsWith('@')) return false;
    if (normalized.endsWith('@')) return false;

    const [localPart, domain] = normalized.split('@');

    // Local part validation
    if (!localPart || localPart.length === 0 || localPart.length > 64) return false;
    if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
    if (localPart.includes('..')) return false; // No consecutive dots

    // Domain validation
    if (!domain || !domain.includes('.')) return false; // Must have TLD
    if (domain.length > 253) return false;
    if (domain.startsWith('.') || domain.endsWith('.')) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;

    // Regex check
    return this.emailRegex.test(normalized);
  }

  /**
   * Normalize phone number to E.164 format
   * - Removes all non-digit characters except +
   * - Adds default country code if missing
   * - Formats as +[country code][number]
   *
   * @param phone Raw phone input
   * @param defaultCountryCode Default country code (defaults to +1)
   * @returns Normalized phone in E.164 format
   */
  async normalizePhone(phone: string, defaultCountryCode?: string): Promise<string> {
    if (!phone) return '';

    // Get default country code from config if not provided
    if (!defaultCountryCode) {
      const contactConfig = await configService.getContactConfig();
      defaultCountryCode = contactConfig.defaultCountryCode;
    }

    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If already has +, clean it up
    if (cleaned.startsWith('+')) {
      // Remove any extra + signs
      cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
      return cleaned;
    }

    // If 10 digits, assume US number
    if (cleaned.length === 10) {
      return `${defaultCountryCode}${cleaned}`;
    }

    // If 11 digits starting with 1, assume US
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }

    // Otherwise, add default country code
    if (cleaned.length >= 10 && cleaned.length <= 15) {
      return `${defaultCountryCode}${cleaned}`;
    }

    return cleaned; // Return as-is if doesn't match patterns
  }

  /**
   * Validate phone number (E.164 format)
   *
   * @param phone Phone number to validate
   * @returns true if valid, false otherwise
   */
  async validatePhone(phone: string): Promise<boolean> {
    const normalized = await this.normalizePhone(phone);

    // Must start with +
    if (!normalized.startsWith('+')) return false;

    // Remove + and check digits
    const digitsOnly = normalized.slice(1);

    // Check length (10-15 digits)
    if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;

    // Must be all digits
    if (!/^\d+$/.test(digitsOnly)) return false;

    // E.164 format check (country code can't start with 0)
    return this.e164Regex.test(normalized);
  }

  /**
   * Detect contact type (email or phone)
   *
   * @param contact Contact string
   * @returns 'email' | 'phone' | null
   */
  detectContactType(contact: string): 'email' | 'phone' | null {
    if (!contact || typeof contact !== 'string') return null;

    const trimmed = contact.trim();
    if (!trimmed) return null;

    // Check if contains @ symbol (email indicator)
    if (trimmed.includes('@')) {
      return 'email';
    }

    // Check if contains digits (phone indicator)
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 10) {
      return 'phone';
    }

    return null;
  }

  /**
   * Normalize contact based on type
   *
   * @param contact Contact string
   * @param type Contact type ('email' | 'phone')
   * @returns Normalized contact
   */
  async normalizeContact(contact: string, type: 'email' | 'phone'): Promise<string> {
    if (type === 'email') {
      return this.normalizeEmail(contact);
    } else {
      return await this.normalizePhone(contact);
    }
  }

  /**
   * Validate contact based on type
   *
   * @param contact Contact string
   * @param type Contact type ('email' | 'phone')
   * @returns true if valid, false otherwise
   */
  async validateContact(contact: string, type: 'email' | 'phone'): Promise<boolean> {
    if (type === 'email') {
      return this.validateEmail(contact);
    } else {
      return await this.validatePhone(contact);
    }
  }

  /**
   * Normalize and validate contact (auto-detect type)
   *
   * @param contact Contact string
   * @returns Object with normalized contact, type, and validation result
   */
  async normalizeAndValidate(contact: string): Promise<{
    normalized: string;
    type: 'email' | 'phone' | null;
    valid: boolean;
  }> {
    const type = this.detectContactType(contact);

    if (!type) {
      return {
        normalized: contact.trim(),
        type: null,
        valid: false,
      };
    }

    const normalized = await this.normalizeContact(contact, type);
    const valid = await this.validateContact(normalized, type);

    return {
      normalized,
      type,
      valid,
    };
  }
}

// Export singleton instance
export const contactService = new ContactService();

export default contactService;
