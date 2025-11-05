# Robust Authentication Backend Service - Comprehensive Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Current vs Improved Architecture](#current-vs-improved-architecture)
3. [Design Patterns & Best Practices](#design-patterns--best-practices)
4. [Implementation Plan](#implementation-plan)
5. [Code Examples](#code-examples)

---

## Architecture Overview

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client Request                                            │
│      ↓                                                      │
│  Rate Limiting (Redis)                                      │
│      ↓                                                      │
│  Input Validation (Zod)                                     │
│      ↓                                                      │
│  OTP Generation & Storage (Redis + DB)                     │
│      ↓                                                      │
│  OTP Delivery (Email/SMS Service)                          │
│      ↓                                                      │
│  OTP Verification                                           │
│      ↓                                                      │
│  Session Management (Express-Session + Redis)               │
│      ↓                                                      │
│  User Creation/Update (PostgreSQL)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Technologies

1. **Redis**: OTP storage with TTL, rate limiting, session storage
2. **PostgreSQL**: User data, OTP audit trail
3. **Express-Session**: Session management with Redis store
4. **Rate Limiting**: Sliding window algorithm in Redis
5. **OTP Services**: Email (SendGrid) + SMS (Twilio/AWS SNS)

---

## Current vs Improved Architecture

### Current Architecture Issues

1. **OTP Storage**: Stored in PostgreSQL → Slow, requires cleanup
2. **Phone Support**: Not implemented
3. **Rate Limiting**: Basic implementation, needs improvement
4. **Registration**: Doesn't support phone verification
5. **OTP Cleanup**: Manual cleanup needed

### Improved Architecture

#### 1. **Hybrid Storage Strategy**

```
OTP Storage:
├── Redis (Primary) - Fast lookup, auto-expiry
│   ├── Key: otp:{email|phone}:{id}
│   ├── Value: { hashedOTP, createdAt, type, attempts }
│   └── TTL: 10 minutes
│
└── PostgreSQL (Audit) - Permanent record
    └── Only for successful/failed attempts
```

#### 2. **Dual Contact Support**

```
Contact Types:
├── Email
│   ├── Normalization: lowercase, trim
│   └── Validation: RFC 5322 compliant
│
└── Phone
    ├── Normalization: E.164 format (+1234567890)
    ├── Validation: 10-15 digits
    └── Country code support
```

**📧 Email Normalization & Validation - Detailed Explanation**

**Why Normalize Email?**

Email addresses are case-insensitive, but users might type them differently:

```
User types: "John.Doe@EXAMPLE.COM"
Same as:     "john.doe@example.com"
Same as:     "JOHN.DOE@EXAMPLE.COM"
```

Without normalization, these would be treated as **different emails** in your database!

**Email Normalization Process:**

```typescript
function normalizeEmail(email: string): string {
  // Step 1: Trim whitespace
  let normalized = email.trim();
  // "  john@example.com  " → "john@example.com"

  // Step 2: Convert to lowercase
  normalized = normalized.toLowerCase();
  // "John@Example.COM" → "john@example.com"

  // Step 3: Remove any extra whitespace between parts
  normalized = normalized.replace(/\s+/g, '');
  // "john @ example.com" → "john@example.com"

  return normalized;
}
```

**Examples:**

```
Input:                    Normalized:
─────────────────────────────────────────────
"John@Example.COM"      → "john@example.com"
"  JANE@TEST.COM  "     → "jane@test.com"
"user+tag@DOMAIN.co.uk" → "user+tag@domain.co.uk"
"Test.User@Example.COM" → "test.user@example.com"
```

**Email Validation: RFC 5322**

RFC 5322 is the **official email standard**. It defines what makes a valid email.

**Basic Structure:**

```
local-part@domain
│         │
│         └─ Domain (must have at least one dot)
└─ Local part (before @)
```

**RFC 5322 Rules:**

1. **Local Part** (before @):
   - Can contain: letters, numbers, dots, hyphens, underscores, plus signs
   - Can't start or end with dot
   - Can be up to 64 characters

2. **Domain Part** (after @):
   - Must have at least one dot (TLD required)
   - Can contain: letters, numbers, hyphens, dots
   - Can't start or end with dot or hyphen
   - Maximum 253 characters

**Valid Email Examples:**

```
✅ Valid:
user@example.com
john.doe@example.co.uk
user+tag@example.com
test_user@example-domain.com
123@example.com

❌ Invalid:
user@example          (no TLD)
@example.com          (no local part)
user@                 (no domain)
user name@example.com (space in local part)
user@.com             (domain starts with dot)
```

**Code Implementation:**

```typescript
import { z } from 'zod';

// Email normalization
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/\s+/g, '');
}

// Email validation (RFC 5322 compliant)
const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

function validateEmail(email: string): boolean {
  const normalized = normalizeEmail(email);

  // Basic checks
  if (!normalized.includes('@')) return false;
  if (normalized.startsWith('@')) return false;
  if (normalized.endsWith('@')) return false;

  const [localPart, domain] = normalized.split('@');

  // Local part validation
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (localPart.startsWith('.') || localPart.endsWith('.')) return false;
  if (localPart.includes('..')) return false; // No consecutive dots

  // Domain validation
  if (!domain.includes('.')) return false; // Must have TLD
  if (domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.')) return false;
  if (domain.startsWith('-') || domain.endsWith('-')) return false;

  // Regex check
  return emailRegex.test(normalized);
}

// Zod schema
const emailSchema = z.string().transform(normalizeEmail).refine(validateEmail, {
  message: 'Invalid email address',
});
```

**📱 Phone Normalization & Validation - Detailed Explanation**

**Why Normalize Phone Numbers?**

Phone numbers can be entered in many formats:

```
User types: "(123) 456-7890"
Same as:     "123-456-7890"
Same as:     "+1 123 456 7890"
Same as:     "1234567890"
```

All should normalize to: **+11234567890** (E.164 format)

**E.164 Format Explained:**

E.164 is the **international standard** for phone numbers.

**Format:** `+[country code][number]`

**Structure:**

```
+ 1 234567890
│ │ └───────── National number
│ └─────────── Country code (1-3 digits)
└───────────── Plus sign (required)
```

**Examples:**

```
Country    | Input              | E.164 Format
───────────┼────────────────────┼──────────────────
US         | (123) 456-7890     | +11234567890
US         | 123-456-7890       | +11234567890
UK         | +44 20 7946 0958   | +442079460958
India      | +91 98765 43210    | +919876543210
```

**Phone Normalization Process:**

```typescript
function normalizePhone(phone: string, defaultCountryCode: string = '1'): string {
  // Step 1: Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');
  // "(123) 456-7890" → "1234567890"
  // "+1 234 567 890" → "+1234567890"

  // Step 2: Handle leading +
  if (cleaned.startsWith('+')) {
    // Already has country code
    // Remove any extra + signs
    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
    return cleaned;
  }

  // Step 3: Check if it looks like a US number (10 digits)
  if (cleaned.length === 10) {
    // Assume US number, add country code
    return `+${defaultCountryCode}${cleaned}`;
  }

  // Step 4: If 11 digits starting with 1, assume US
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Step 5: If no country code and doesn't match patterns, add default
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  return cleaned; // Return as-is if already formatted
}
```

**Phone Validation:**

**Rules:**

1. **Length**: 10-15 digits (after removing formatting)
2. **Format**: Must start with + (E.164)
3. **Country Code**: 1-3 digits
4. **National Number**: 7-14 digits
5. **Total**: Maximum 15 digits total

**Examples:**

```
✅ Valid:
+11234567890       (US, 11 digits total)
+919876543210      (India, 12 digits total)
+442079460958      (UK, 12 digits total)
+8613800138000     (China, 13 digits total)

❌ Invalid:
1234567890         (no + sign)
+123456789         (too short, 9 digits)
+1234567890123456  (too long, 16 digits)
+1234567890a       (contains letters)
```

**Code Implementation:**

```typescript
import { z } from 'zod';

// Phone normalization
function normalizePhone(phone: string, defaultCountryCode: string = '1'): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If already has +, clean it up
  if (cleaned.startsWith('+')) {
    return '+' + cleaned.slice(1).replace(/\+/g, '');
  }

  // If 10 digits, assume US number
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  // If 11 digits starting with 1, assume US
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // Otherwise, add default country code
  if (cleaned.length >= 10 && cleaned.length <= 15) {
    return `+${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}

// Phone validation
function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);

  // Must start with +
  if (!normalized.startsWith('+')) return false;

  // Remove + and check digits
  const digitsOnly = normalized.slice(1);

  // Check length (10-15 digits)
  if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;

  // Must be all digits
  if (!/^\d+$/.test(digitsOnly)) return false;

  // E.164 format check
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(normalized);
}

// Zod schema
const phoneSchema = z
  .string()
  .transform((val) => normalizePhone(val))
  .refine(validatePhone, {
    message: 'Invalid phone number. Must be in E.164 format (+1234567890)',
  });
```

**Common Issues & Edge Cases:**

**Email:**

1. **Gmail Dots:**

   ```
   "john.doe@gmail.com" = "johndoe@gmail.com"
   Gmail ignores dots! But for your system, treat as different.
   ```

2. **Plus Sign Aliases:**

   ```
   "user+tag@example.com" ≠ "user@example.com"
   These are different emails (can be used for filtering)
   ```

3. **Unicode/International:**
   ```
   "测试@example.com" - Valid but may need special handling
   ```

**Phone:**

1. **Leading Zeros:**

   ```
   "+1234567890" ✅ Correct
   "+01234567890" ❌ Wrong (country code can't start with 0)
   ```

2. **International vs National:**

   ```
   "1234567890" - National format (US)
   "+11234567890" - International format (E.164)
   Always normalize to E.164!
   ```

3. **Extension Numbers:**
   ```
   "+11234567890 ext 123" - Extensions not supported in E.164
   Store separately if needed
   ```

**Best Practices:**

1. ✅ **Always normalize** before storing
2. ✅ **Validate** before accepting
3. ✅ **Store normalized** version in database
4. ✅ **Display original** to user (if they prefer)
5. ✅ **Use same normalization** for lookup and storage
6. ✅ **Handle edge cases** gracefully

**Why This Matters:**

```
Without Normalization:
User registers: "John@Example.COM"
User logs in:   "john@example.com"
Result: ❌ "User not found" (treated as different emails!)

With Normalization:
User registers: "John@Example.COM" → "john@example.com"
User logs in:   "john@example.com" → "john@example.com"
Result: ✅ Success! (same normalized email)
```

#### 3. **Advanced Rate Limiting**

```
Rate Limits:
├── Per Email/Phone: 5 requests/hour
├── Per IP: 10 requests/hour
├── Verification Attempts: 3 attempts/OTP
└── Sliding Window: Precise, fair distribution
```

---

## Design Patterns & Best Practices

### 1. **Service Layer Pattern**

Separate business logic from route handlers:

```
routes/
  └── auth.ts (Routes only)
services/
  ├── otpService.ts (OTP generation, storage)
  ├── emailService.ts (Email sending)
  ├── smsService.ts (SMS sending)
  └── authService.ts (Auth orchestration)
```

**Benefits:**

- Testability
- Reusability
- Maintainability
- Single Responsibility Principle

### 2. **Repository Pattern**

Abstract database operations:

```typescript
// Instead of direct Prisma calls in routes
prisma.user.findUnique(...)

// Use repository
userRepository.findByEmail(email)
```

**Benefits:**

- Database agnostic
- Easier testing
- Centralized queries

### 3. **Strategy Pattern for OTP Delivery**

```typescript
interface OTPDeliveryStrategy {
  send(contact: string, otp: string): Promise<void>;
}

class EmailDelivery implements OTPDeliveryStrategy { ... }
class SMSDelivery implements OTPDeliveryStrategy { ... }
```

### 4. **Command Pattern for Operations**

```typescript
interface AuthCommand {
  execute(): Promise<AuthResult>;
}

class RequestOTPCommand implements AuthCommand { ... }
class VerifyOTPCommand implements AuthCommand { ... }
```

### 5. **Security Best Practices**

#### OTP Generation

```typescript
// ✅ GOOD: Cryptographically secure
const otp = crypto.randomInt(100000, 999999).toString();

// ❌ BAD: Predictable
const otp = Math.floor(Math.random() * 1000000).toString();
```

#### OTP Storage

```typescript
// ✅ GOOD: Hashed storage
const hashedOTP = hashOTP(contact, otp);
await redis.set(`otp:${contact}:${id}`, hashedOTP, 'EX', 600);

// ❌ BAD: Plain text
await redis.set(`otp:${contact}`, otp);
```

#### Rate Limiting

```typescript
// ✅ GOOD: Sliding window
const key = `rate:${contact}:${hour}`;
const count = await redis.incr(key);
await redis.expire(key, 3600);

// ❌ BAD: Fixed window (unfair)
```

#### User Enumeration Prevention

```typescript
// ✅ GOOD: Same response for valid/invalid
res.status(204).send(); // Always success

// ❌ BAD: Different responses
if (userExists) return res.json({ success: true });
else return res.status(404).json({ error: 'Not found' });
```

### 6. **Error Handling**

```typescript
// ✅ GOOD: Consistent error format
class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

// Usage
throw new AuthError('INVALID_OTP', 'OTP expired or invalid', 400);
```

### 7. **Validation Strategy**

```typescript
// ✅ GOOD: Schema-based validation
const requestSchema = z
  .object({
    email: z.string().email().optional(),
    phoneNumber: z.string().refine(isValidPhone).optional(),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: 'Either email or phone is required',
  });
```

---

## Implementation Plan

### Phase 1: Database Schema Updates

```prisma
model User {
  id              String    @id @default(cuid())
  email           String?   @unique
  phoneNumber     String?   @unique
  emailVerifiedAt DateTime?
  phoneVerifiedAt DateTime?
  firstName       String?
  lastName        String?
  createdVia      String
  status          String    @default("active")
  tokenVersion    Int       @default(1)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([email])
  @@index([phoneNumber])
}

model OTPToken {
  id          String    @id @default(cuid())
  contact     String    // email or phone
  contactType String    // 'email' | 'phone'
  tokenHash   String
  attempts    Int       @default(0)
  maxAttempts Int       @default(3)
  usedAt      DateTime?
  expiresAt   DateTime
  ipHash      String?
  uaHash      String?
  createdAt   DateTime  @default(now())

  @@index([contact, contactType])
  @@index([expiresAt])
}
```

### Phase 2: Redis Structure

```typescript
// OTP Storage
Key: `otp:${contactType}:${contact}:${id}`
Value: {
  hash: string,        // Hashed OTP
  attempts: number,    // Verification attempts
  createdAt: number,   // Timestamp
  ipHash?: string,
  uaHash?: string
}
TTL: 600 seconds (10 minutes)

// Rate Limiting
Key: `rate:${type}:${identifier}:${window}`
Value: count
TTL: window duration

// Session Storage (handled by express-session-redis)
Key: `sess:${sessionId}`
```

### Phase 3: Service Layer Implementation

#### OTP Service

```typescript
class OTPService {
  async generateOTP(contact: string, type: 'email' | 'phone'): Promise<string>;
  async storeOTP(contact: string, type: string, otp: string): Promise<string>;
  async verifyOTP(contact: string, type: string, otp: string): Promise<boolean>;
  async invalidateOTP(contact: string, type: string, id: string): Promise<void>;
  async getRemainingAttempts(contact: string, type: string, id: string): Promise<number>;
}
```

#### Contact Service

```typescript
class ContactService {
  normalizeEmail(email: string): string;
  normalizePhone(phone: string): string;
  validateEmail(email: string): boolean;
  validatePhone(phone: string): boolean;
  detectContactType(input: string): 'email' | 'phone' | null;
}
```

### Phase 4: Rate Limiting Enhancement

```typescript
class RateLimiter {
  async check(
    identifier: string,
    type: 'email' | 'phone' | 'ip',
    limit: number,
    window: number
  ): Promise<RateLimitResult>;
}
```

### Phase 5: OTP Delivery Services

```typescript
class EmailService {
  async sendOTP(email: string, otp: string): Promise<void>;
}

class SMSService {
  async sendOTP(phone: string, otp: string): Promise<void>;
}
```

---

## Code Examples

### Example 1: Enhanced OTP Service

```typescript
// src/services/otpService.ts
import crypto from 'crypto';
import { redis } from '../lib/redis';
import { prisma } from '../db/prisma';
import { hashOTP, verifyOTP } from '../lib/crypto';
import { generateOTP } from '../lib/crypto';

export interface OTPOptions {
  contact: string;
  contactType: 'email' | 'phone';
  ipHash?: string;
  uaHash?: string;
  ttl?: number; // seconds
}

export interface OTPResult {
  id: string;
  expiresAt: Date;
}

class OTPService {
  private readonly DEFAULT_TTL = 600; // 10 minutes
  private readonly MAX_ATTEMPTS = 3;

  /**
   * Generate and store OTP
   */
  async generateAndStore(options: OTPOptions): Promise<OTPResult> {
    const { contact, contactType, ipHash, uaHash, ttl = this.DEFAULT_TTL } = options;

    // Generate OTP
    const otp = generateOTP(6);
    const otpId = crypto.randomUUID();

    // Hash OTP
    const hashedOTP = hashOTP(contact, otp);

    // Calculate expiry
    const expiresAt = new Date(Date.now() + ttl * 1000);

    // Store in Redis (primary storage)
    const redisKey = `otp:${contactType}:${contact}:${otpId}`;
    const redisValue = JSON.stringify({
      hash: hashedOTP,
      attempts: 0,
      createdAt: Date.now(),
      ipHash,
      uaHash,
    });

    await redis.setex(redisKey, ttl, redisValue);

    // Store audit record in DB (optional, for analytics)
    await prisma.oTPToken.create({
      data: {
        contact,
        contactType,
        tokenHash: hashedOTP,
        attempts: 0,
        maxAttempts: this.MAX_ATTEMPTS,
        expiresAt,
        ipHash,
        uaHash,
      },
    });

    return {
      id: otpId,
      expiresAt,
    };
  }

  /**
   * Verify OTP
   */
  async verify(
    contact: string,
    contactType: 'email' | 'phone',
    otp: string,
    otpId: string
  ): Promise<{ valid: boolean; attemptsRemaining: number }> {
    const redisKey = `otp:${contactType}:${contact}:${otpId}`;
    const redisData = await redis.get(redisKey);

    if (!redisData) {
      return { valid: false, attemptsRemaining: 0 };
    }

    const data = JSON.parse(redisData);
    const attempts = data.attempts || 0;

    // Check max attempts
    if (attempts >= this.MAX_ATTEMPTS) {
      await redis.del(redisKey);
      return { valid: false, attemptsRemaining: 0 };
    }

    // Verify OTP
    const isValid = verifyOTP(contact, otp, data.hash);

    if (!isValid) {
      // Increment attempts
      const updatedData = { ...data, attempts: attempts + 1 };
      await redis.setex(redisKey, redis.ttl(redisKey) || 600, JSON.stringify(updatedData));

      // Update DB
      await prisma.oTPToken.updateMany({
        where: {
          contact,
          contactType,
          id: otpId,
        },
        data: {
          attempts: attempts + 1,
        },
      });

      return {
        valid: false,
        attemptsRemaining: this.MAX_ATTEMPTS - attempts - 1,
      };
    }

    // Mark as used
    await redis.del(redisKey);

    await prisma.oTPToken.updateMany({
      where: {
        contact,
        contactType,
        id: otpId,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return { valid: true, attemptsRemaining: 0 };
  }

  /**
   * Invalidate OTP
   */
  async invalidate(contact: string, contactType: 'email' | 'phone', otpId: string): Promise<void> {
    const redisKey = `otp:${contactType}:${contact}:${otpId}`;
    await redis.del(redisKey);
  }

  /**
   * Cleanup expired OTPs (cron job)
   */
  async cleanupExpired(): Promise<number> {
    const expired = await prisma.oTPToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        usedAt: null,
      },
    });

    return expired.count;
  }
}

export const otpService = new OTPService();
```

### Example 2: Contact Service

```typescript
// src/services/contactService.ts
import { z } from 'zod';

const emailSchema = z.string().email();
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/); // E.164 format

export class ContactService {
  /**
   * Normalize email
   */
  normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Normalize phone to E.164 format
   */
  normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (!cleaned.startsWith('+')) {
      // Assume default country code (you can make this configurable)
      cleaned = '+1' + cleaned; // Default to US
    }

    return cleaned;
  }

  /**
   * Validate email
   */
  validateEmail(email: string): boolean {
    return emailSchema.safeParse(email).success;
  }

  /**
   * Validate phone
   */
  validatePhone(phone: string): boolean {
    return phoneSchema.safeParse(phone).success;
  }

  /**
   * Detect contact type
   */
  detectContactType(input: string): 'email' | 'phone' | null {
    if (this.validateEmail(input)) return 'email';
    if (this.validatePhone(input)) return 'phone';
    return null;
  }

  /**
   * Normalize contact based on type
   */
  normalizeContact(contact: string, type: 'email' | 'phone'): string {
    return type === 'email' ? this.normalizeEmail(contact) : this.normalizePhone(contact);
  }
}

export const contactService = new ContactService();
```

### Example 3: Enhanced Rate Limiting

```typescript
// src/lib/rateLimit.ts
import { Request } from 'express';
import { redis } from './redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export class RateLimiter {
  /**
   * Sliding window rate limiter
   */
  async check(
    identifier: string,
    type: 'email' | 'phone' | 'ip',
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const key = `rate:${type}:${identifier}`;
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use sorted set for sliding window
    const pipeline = redis.pipeline();

    // Remove expired entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // Set expiry
    pipeline.expire(key, windowSeconds);

    const results = await pipeline.exec();

    if (!results) {
      return { allowed: true, remaining: limit, resetTime: now + windowSeconds * 1000 };
    }

    const currentCount = results[1][1] as number;
    const allowed = currentCount < limit;

    return {
      allowed,
      remaining: Math.max(0, limit - currentCount - 1),
      resetTime: now + windowSeconds * 1000,
    };
  }
}

export const rateLimiter = new RateLimiter();

// Pre-configured rate limiters
export const emailRateLimit = {
  check: (req: Request) => {
    const email = req.body.email || req.body.contact;
    return rateLimiter.check(email, 'email', 5, 3600); // 5 per hour
  },
};

export const phoneRateLimit = {
  check: (req: Request) => {
    const phone = req.body.phoneNumber || req.body.contact;
    return rateLimiter.check(phone, 'phone', 5, 3600); // 5 per hour
  },
};

export const ipRateLimit = {
  check: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return rateLimiter.check(ip, 'ip', 10, 3600); // 10 per hour
  },
};

export const verifyRateLimit = {
  check: (req: Request) => {
    const contact = req.body.email || req.body.phoneNumber || req.body.contact;
    return rateLimiter.check(contact, 'email', 3, 600); // 3 per 10 minutes
  },
};
```

### Example 4: SMS Service

```typescript
// src/services/smsService.ts
import twilio from 'twilio';
import { env } from '../config/env';

class SMSService {
  private client: twilio.Twilio;

  constructor() {
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    }
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phoneNumber: string, otp: string): Promise<void> {
    if (!this.client) {
      throw new Error('SMS service not configured');
    }

    const message = `Your verification code is: ${otp}. Valid for 10 minutes.`;

    try {
      await this.client.messages.create({
        body: message,
        from: env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  /**
   * Send OTP via AWS SNS (Alternative)
   */
  async sendOTPViaSNS(phoneNumber: string, otp: string): Promise<void> {
    // AWS SNS implementation
    // Similar pattern
  }
}

export const smsService = new SMSService();
```

### Example 5: Auth Service (Orchestration)

```typescript
// src/services/authService.ts
import { otpService } from './otpService';
import { contactService } from './contactService';
import { emailService } from './emailService';
import { smsService } from './smsService';
import { prisma } from '../db/prisma';

export class AuthService {
  /**
   * Request OTP for login
   */
  async requestOTP(
    contact: string,
    type?: 'email' | 'phone'
  ): Promise<{ otpId: string; expiresAt: Date }> {
    // Detect type if not provided
    const contactType = type || contactService.detectContactType(contact);
    if (!contactType) {
      throw new Error('Invalid contact format');
    }

    // Normalize contact
    const normalizedContact = contactService.normalizeContact(contact, contactType);

    // Generate and store OTP
    const { id, expiresAt } = await otpService.generateAndStore({
      contact: normalizedContact,
      contactType,
    });

    // Send OTP
    if (contactType === 'email') {
      await emailService.sendOTP(normalizedContact, id); // In production, send actual OTP
    } else {
      await smsService.sendOTP(normalizedContact, id); // In production, send actual OTP
    }

    return { otpId: id, expiresAt };
  }

  /**
   * Verify OTP and create session
   */
  async verifyOTP(
    contact: string,
    contactType: 'email' | 'phone',
    otp: string,
    otpId: string,
    session: any
  ): Promise<{ user: any }> {
    const normalizedContact = contactService.normalizeContact(contact, contactType);

    // Verify OTP
    const { valid, attemptsRemaining } = await otpService.verify(
      normalizedContact,
      contactType,
      otp,
      otpId
    );

    if (!valid) {
      throw new Error(`Invalid OTP. ${attemptsRemaining} attempts remaining.`);
    }

    // Find or create user
    const user = await this.findOrCreateUser(normalizedContact, contactType);

    // Create session
    await new Promise<void>((resolve, reject) => {
      session.regenerate((err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });

    session.userId = user.id;

    return { user };
  }

  /**
   * Register user with multiple contacts
   */
  async register(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phoneNumber?: string;
  }): Promise<{ emailOtpId?: string; phoneOtpId?: string }> {
    const result: any = {};

    // Create user record (unverified)
    const user = await prisma.user.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ? contactService.normalizeEmail(data.email) : null,
        phoneNumber: data.phoneNumber ? contactService.normalizePhone(data.phoneNumber) : null,
        createdVia: 'registration',
      },
    });

    // Request OTP for email if provided
    if (data.email) {
      const { id } = await this.requestOTP(data.email, 'email');
      result.emailOtpId = id;
    }

    // Request OTP for phone if provided
    if (data.phoneNumber) {
      const { id } = await this.requestOTP(data.phoneNumber, 'phone');
      result.phoneOtpId = id;
    }

    return result;
  }

  private async findOrCreateUser(contact: string, type: 'email' | 'phone'): Promise<any> {
    const where = type === 'email' ? { email: contact } : { phoneNumber: contact };

    return prisma.user.upsert({
      where,
      update: {
        [`${type}VerifiedAt`]: new Date(),
        tokenVersion: { increment: 1 },
      },
      create: {
        [type]: contact,
        [`${type}VerifiedAt`]: new Date(),
        createdVia: `${type}_passwordless`,
      },
    });
  }
}

export const authService = new AuthService();
```

---

## Next Steps

1. **Review this guide** - Understand the architecture
2. **Database Migration** - Update Prisma schema
3. **Service Implementation** - Build services layer by layer
4. **Testing** - Unit tests for each service
5. **Integration** - Update routes to use new services
6. **Monitoring** - Add logging and metrics

Would you like me to start implementing these changes step by step?
