# Authentication System Design Document

## Purpose

This document defines what features we **NEED** and what we **DON'T NEED** for our authentication system. Use this as a reference guide when making implementation decisions.

---

## 📋 Requirements (What We NEED)

### ✅ Core Authentication Features

#### 1. Login Flow

- [x] Login with **email OR phone** (either one)
- [x] OTP verification via email
- [x] OTP verification via SMS/phone
- [x] Session creation after successful verification
- [x] Automatic session management (Redis)

#### 2. Registration Flow

- [x] Registration with **firstName** and **lastName** (required)
- [x] Registration with **email OR phone** (at least one required)
- [x] Support for **both email AND phone** (if user provides both)
- [x] Sequential verification: Verify email first, then phone (if provided)
- [x] User creation after successful verification

#### 3. OTP System

- [x] OTP generation (6 digits, cryptographically secure)
- [x] OTP expiry: **10 minutes** per code
- [x] OTP storage: **Redis (primary)** + **Database (audit)**
- [x] OTP hashing (HMAC-SHA256, never plain text)
- [x] Max verification attempts: **3 attempts** per OTP
- [x] Resend timer: **60 seconds** (UI countdown)

#### 4. Rate Limiting

- [x] **Sliding window** algorithm (not fixed window)
- [x] Per email/phone: **5 requests per hour**
- [x] Per IP: **10 requests per hour**
- [x] Verification attempts: **3 attempts per 10 minutes**
- [x] Redis-based implementation

#### 5. Contact Normalization

- [x] Email normalization: lowercase, trim
- [x] Email validation: RFC 5322 compliant
- [x] Phone normalization: E.164 format (+1234567890)
- [x] Phone validation: 10-15 digits
- [x] Default country code support (configurable)

#### 6. Session Management

- [x] Express-session with Redis store
- [x] Session regeneration on login
- [x] Session index tracking (user_session_index)
- [x] Cookie-based session (secure, httpOnly)

#### 7. User Management

- [x] User model with email and phoneNumber (both optional, but at least one required)
- [x] firstName and lastName fields
- [x] emailVerifiedAt and phoneVerifiedAt timestamps
- [x] User status tracking
- [x] Token version for invalidation

#### 8. Global Configuration System ✅ REQUIRED

- [x] Database-stored configuration values
- [x] Configurable OTP length (4-8 digits)
- [x] Configurable OTP expiry time
- [x] Configurable rate limits
- [x] Hardcoded OTP for testing/development (uses last 4 digits of phone number)
- [x] Configuration caching (Redis)
- [x] Runtime configuration updates (no restart needed)

---

## ❌ Non-Requirements (What We DON'T NEED)

### Authentication Features We DON'T Need

#### 1. Password-Based Authentication

- ❌ No password login
- ❌ No password reset
- ❌ No password change
- ❌ No password strength validation
- **Reason**: We're using passwordless OTP authentication only

#### 2. Social Login

- ❌ No Google OAuth
- ❌ No Facebook login
- ❌ No GitHub login
- ❌ No social media integration
- **Reason**: OTP-based authentication only

#### 3. Two-Factor Authentication (2FA)

- ❌ No TOTP (Time-based OTP)
- ❌ No Authenticator apps
- ❌ No backup codes
- **Reason**: OTP verification IS our authentication method

#### 4. Magic Links

- ❌ No magic link authentication
- ❌ No email link login
- **Reason**: We're using OTP codes only

#### 5. Biometric Authentication

- ❌ No fingerprint login
- ❌ No face ID
- ❌ No biometric verification
- **Reason**: Not required for web application

#### 6. Advanced Security Features

- ❌ No device fingerprinting (beyond basic IP/UA hash)
- ❌ No geolocation verification
- ❌ No SMS fallback if email fails
- ❌ No OTP delivery via multiple channels simultaneously
- **Reason**: Keep it simple, sufficient security

#### 7. User Features

- ❌ No email change after registration
- ❌ No phone number change after registration
- ❌ No account deletion
- ❌ No account recovery
- ❌ No profile picture upload
- **Reason**: Focus on core authentication only

#### 8. Admin Features

- ❌ No admin dashboard
- ❌ No user management UI
- ❌ No OTP analytics dashboard
- ❌ No bulk user operations
- **Reason**: Not in scope for MVP

#### 9. Additional Verification

- ❌ No email verification required before login
- ❌ No phone verification required before login
- ❌ No re-verification after X days
- **Reason**: Verification happens during registration/login flow

#### 10. Advanced Rate Limiting

- ❌ No dynamic rate limiting based on user behavior
- ❌ No IP whitelisting/blacklisting
- ❌ No CAPTCHA integration
- ❌ No honeypot fields
- **Reason**: Basic sliding window is sufficient

---

## 🤔 Decision Points (To Be Decided)

### Email Service Provider

- [ ] **Option A**: SendGrid ✅ Recommended
- [ ] **Option B**: AWS SES
- [ ] **Option C**: Nodemailer (SMTP)
- **Decision**: **\*\***\_\_\_**\*\***

### SMS Service Provider

- [ ] **Option A**: Twilio ✅ Recommended
- [ ] **Option B**: AWS SNS
- [ ] **Option C**: MessageBird
- **Decision**: **\*\***\_\_\_**\*\***

### Default Country Code

- [ ] **Option A**: +1 (US) ✅ Default
- [ ] **Option B**: Auto-detect from IP
- [ ] **Option C**: User selection
- **Decision**: **\*\***\_\_\_**\*\***

### OTP Length

- [ ] **Option A**: 6 digits ✅ Current
- [ ] **Option B**: 4 digits (shorter, less secure)
- [ ] **Option C**: 8 digits (longer, more secure)
- **Decision**: **\*\***\_\_\_**\*\***

### OTP Expiry Time

- [ ] **Option A**: 10 minutes ✅ Current
- [ ] **Option B**: 5 minutes (more secure)
- [ ] **Option C**: 15 minutes (more user-friendly)
- **Decision**: **\*\***\_\_\_**\*\***

### Rate Limit Values

- [ ] **Option A**: 5/hour per contact ✅ Current
- [ ] **Option B**: 3/hour (stricter)
- [ ] **Option C**: 10/hour (more lenient)
- **Decision**: **\*\***\_\_\_**\*\***

### Database Audit Retention

- [ ] **Option A**: Keep forever ✅ Recommended
- [ ] **Option B**: Delete after 90 days
- [ ] **Option C**: Delete after 30 days
- **Decision**: **\*\***\_\_\_**\*\***

---

## 🎯 Implementation Priorities

### Phase 1: MVP (Must Have) 🔴

1. ✅ Email normalization & validation
2. ✅ Phone normalization & validation
3. ✅ Global configuration system (database + Redis cache)
4. ✅ OTP generation & storage (Redis + DB)
5. ✅ Email OTP sending
6. ✅ OTP verification
7. ✅ Session management
8. ✅ Basic rate limiting (sliding window)
9. ✅ Login flow (email or phone)
10. ✅ Registration flow (single contact)

### Phase 2: Enhanced (Should Have) 🟡

1. ⏳ SMS/Phone OTP sending
2. ⏳ Registration with both email and phone
3. ⏳ Sequential verification (email then phone)
4. ⏳ Enhanced rate limiting
5. ⏳ Better error handling
6. ⏳ Audit logging improvements

### Phase 3: Polish (Nice to Have) 🟢

1. ⏳ OTP analytics
2. ⏳ Better error messages
3. ⏳ User-friendly timers
4. ⏳ Email/SMS templates customization
5. ⏳ Performance optimizations

---

## 📐 Architecture Decisions

### Storage Strategy

```
✅ USE: Redis + PostgreSQL hybrid
├── Redis: Primary storage (fast lookup)
└── PostgreSQL: Audit trail (compliance)

❌ DON'T USE: Database only (too slow)
❌ DON'T USE: Redis only (no audit trail)
```

### Rate Limiting Algorithm

```
✅ USE: Sliding window (fair, accurate)
❌ DON'T USE: Fixed window (allows bursts)
```

### OTP Storage

```
✅ USE: Hashed OTP (HMAC-SHA256)
❌ DON'T USE: Plain text OTP (security risk)
```

### Contact Normalization

```
✅ USE: Always normalize before storage
✅ USE: Same normalization for lookup
❌ DON'T USE: Store original format only
```

### Error Handling

```
✅ USE: Generic error messages (prevent enumeration)
❌ DON'T USE: Specific error messages (security risk)
```

---

## 🔒 Security Requirements

### Must Have

- ✅ OTP hashing (never plain text)
- ✅ Rate limiting (prevent abuse)
- ✅ Session security (httpOnly, secure cookies)
- ✅ Input validation (Zod schemas)
- ✅ User enumeration prevention
- ✅ Automatic OTP expiry

### Don't Need

- ❌ Advanced threat detection
- ❌ Behavioral analysis
- ❌ Device fingerprinting
- ❌ CAPTCHA
- ❌ Account lockout after X failed attempts

---

## 📊 Data Requirements

### Must Store

- ✅ User: id, email, phoneNumber, firstName, lastName
- ✅ User: emailVerifiedAt, phoneVerifiedAt
- ✅ User: createdAt, updatedAt, status
- ✅ OTP: contact, contactType, tokenHash, attempts
- ✅ OTP: expiresAt, usedAt, createdAt
- ✅ Session: userId, sessionId
- ✅ **Configuration: key, value, type, description, updatedAt**

### Don't Store

- ❌ Plain text OTPs
- ❌ Password hashes (no passwords)
- ❌ User preferences
- ❌ Login history (beyond OTP audit)
- ❌ Device information (beyond IP/UA hash)
- ❌ Geolocation data

---

## ⚙️ Global Configuration System

### Overview

A **database-driven configuration system** that allows runtime changes without code deployment. All configurable values are stored in the database and cached in Redis for performance.

### Why Database Configuration?

**Benefits:**

- ✅ **No code changes** needed to update settings
- ✅ **Runtime updates** (no restart required)
- ✅ **Environment-specific** values (dev/staging/prod)
- ✅ **Audit trail** (who changed what, when)
- ✅ **Testing flexibility** (hardcoded OTP for dev)

**Use Cases:**

- Change OTP length without deploying
- Enable/disable hardcoded OTP for testing
- Adjust rate limits based on traffic
- Toggle features on/off
- Update expiry times

### Database Schema

```prisma
model Configuration {
  id          String   @id @default(cuid())
  key         String   @unique // e.g., "otp.length"
  value       String   // Stored as JSON string
  type        String   // 'number' | 'string' | 'boolean' | 'json'
  description String?
  category    String   // 'otp' | 'rate_limit' | 'security' | 'feature'
  isActive    Boolean  @default(true)
  updatedBy   String?  // User ID who updated
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@index([key])
  @@index([category])
  @@map("configurations")
}
```

### Configuration Keys

#### OTP Configuration

```
Key: "otp.length"
Type: number
Default: 6
Description: "OTP code length (4-8 digits)"
Value: "6"

Key: "otp.expiry_seconds"
Type: number
Default: 600
Description: "OTP expiry time in seconds"
Value: "600"

Key: "otp.max_attempts"
Type: number
Default: 3
Description: "Maximum verification attempts per OTP"
Value: "3"

Key: "otp.hardcoded_enabled"
Type: boolean
Default: false
Description: "Enable hardcoded OTP (for development/testing). When enabled, uses last 4 digits of phone number as OTP"
Value: "false"

Note: When hardcoded_enabled is true:
- For phone numbers: Uses last 4 digits of phone number as OTP (e.g., +11234567890 → "7890")
- For email: Falls back to normal OTP generation
```

#### Rate Limiting Configuration

```
Key: "rate_limit.otp_request_per_hour"
Type: number
Default: 5
Description: "OTP requests per hour per contact"
Value: "5"

Key: "rate_limit.ip_per_hour"
Type: number
Default: 10
Description: "Requests per hour per IP"
Value: "10"

Key: "rate_limit.verify_per_10min"
Type: number
Default: 3
Description: "Verification attempts per 10 minutes"
Value: "3"

Key: "rate_limit.resend_seconds"
Type: number
Default: 60
Description: "Minimum seconds between resend requests"
Value: "60"
```

#### Contact Configuration

```
Key: "contact.default_country_code"
Type: string
Default: "+1"
Description: "Default country code for phone numbers"
Value: "+1"

Key: "contact.email_enabled"
Type: boolean
Default: true
Description: "Enable email authentication"
Value: "true"

Key: "contact.phone_enabled"
Type: boolean
Default: true
Description: "Enable phone authentication"
Value: "true"
```

#### Security Configuration

```
Key: "security.session_ttl_seconds"
Type: number
Default: 86400
Description: "Session expiry time in seconds (24 hours)"
Value: "86400"

Key: "security.require_email_verification"
Type: boolean
Default: false
Description: "Require email verification before login"
Value: "false"

Key: "security.require_phone_verification"
Type: boolean
Default: false
Description: "Require phone verification before login"
Value: "false"
```

#### Feature Flags

```
Key: "feature.registration_enabled"
Type: boolean
Default: true
Description: "Enable user registration"
Value: "true"

Key: "feature.login_enabled"
Type: boolean
Default: true
Description: "Enable user login"
Value: "true"

Key: "feature.sms_enabled"
Type: boolean
Default: false
Description: "Enable SMS OTP delivery"
Value: "false"
```

### Implementation Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Configuration Flow                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Application Startup                                        │
│      ↓                                                      │
│  Load all configs from Database                             │
│      ↓                                                      │
│  Cache in Redis (TTL: 5 minutes)                           │
│      ↓                                                      │
│  Use cached values in application                           │
│                                                             │
│  When config changes:                                       │
│      ↓                                                      │
│  Update Database                                            │
│      ↓                                                      │
│  Invalidate Redis cache                                     │
│      ↓                                                      │
│  Next request loads fresh config                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Code Implementation

```typescript
// src/services/configService.ts
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

type ConfigValue = string | number | boolean | object;

interface ConfigCache {
  [key: string]: ConfigValue;
}

class ConfigService {
  private cache: ConfigCache = {};
  private cacheKey = 'app:config';
  private cacheTTL = 300; // 5 minutes

  /**
   * Load all configurations from database
   */
  async loadAll(): Promise<void> {
    // Try Redis first
    const cached = await redis.get(this.cacheKey);
    if (cached) {
      this.cache = JSON.parse(cached);
      return;
    }

    // Load from database
    const configs = await prisma.configuration.findMany({
      where: { isActive: true },
    });

    // Build cache object
    this.cache = {};
    for (const config of configs) {
      this.cache[config.key] = this.parseValue(config.value, config.type);
    }

    // Cache in Redis
    await redis.setex(this.cacheKey, this.cacheTTL, JSON.stringify(this.cache));
  }

  /**
   * Get configuration value
   */
  async get<T extends ConfigValue>(key: string, defaultValue: T): Promise<T> {
    // Check cache first
    if (this.cache[key] !== undefined) {
      return this.cache[key] as T;
    }

    // Load from database if not cached
    const config = await prisma.configuration.findUnique({
      where: { key },
    });

    if (!config || !config.isActive) {
      return defaultValue;
    }

    const value = this.parseValue(config.value, config.type) as T;

    // Update cache
    this.cache[key] = value;

    return value;
  }

  /**
   * Update configuration value
   */
  async set(
    key: string,
    value: ConfigValue,
    type: 'number' | 'string' | 'boolean' | 'json',
    updatedBy?: string
  ): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    // Update database
    await prisma.configuration.upsert({
      where: { key },
      update: {
        value: stringValue,
        type,
        updatedBy,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: stringValue,
        type,
        category: this.getCategory(key),
        description: this.getDescription(key),
        updatedBy,
      },
    });

    // Invalidate cache
    await redis.del(this.cacheKey);
    delete this.cache[key];

    // Reload
    await this.loadAll();
  }

  /**
   * Get OTP configuration
   */
  async getOTPConfig() {
    return {
      length: await this.get<number>('otp.length', 6),
      expirySeconds: await this.get<number>('otp.expiry_seconds', 600),
      maxAttempts: await this.get<number>('otp.max_attempts', 3),
      hardcodedEnabled: await this.get<boolean>('otp.hardcoded_enabled', false),
    };
  }

  /**
   * Get rate limit configuration
   */
  async getRateLimitConfig() {
    return {
      otpRequestPerHour: await this.get<number>('rate_limit.otp_request_per_hour', 5),
      ipPerHour: await this.get<number>('rate_limit.ip_per_hour', 10),
      verifyPer10Min: await this.get<number>('rate_limit.verify_per_10min', 3),
      resendSeconds: await this.get<number>('rate_limit.resend_seconds', 60),
    };
  }

  /**
   * Parse value based on type
   */
  private parseValue(value: string, type: string): ConfigValue {
    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }

  private getCategory(key: string): string {
    if (key.startsWith('otp.')) return 'otp';
    if (key.startsWith('rate_limit.')) return 'rate_limit';
    if (key.startsWith('contact.')) return 'contact';
    if (key.startsWith('security.')) return 'security';
    if (key.startsWith('feature.')) return 'feature';
    return 'general';
  }

  private getDescription(key: string): string {
    // Return descriptions based on key
    const descriptions: Record<string, string> = {
      'otp.length': 'OTP code length (4-8 digits)',
      'otp.expiry_seconds': 'OTP expiry time in seconds',
      'otp.hardcoded': 'Hardcoded OTP for testing',
      // ... more descriptions
    };
    return descriptions[key] || '';
  }
}

export const configService = new ConfigService();

// Initialize on startup
configService.loadAll().catch(console.error);
```

### Usage Examples

```typescript
// In OTP Service
import { configService } from './configService';

class OTPService {
  async generateOTP(contact: string, contactType: 'email' | 'phone'): Promise<string> {
    const config = await configService.getOTPConfig();

    // Check for hardcoded OTP (testing)
    if (config.hardcodedEnabled) {
      // For phone numbers: use last 4 digits as OTP
      if (contactType === 'phone') {
        // Extract last 4 digits from phone number
        // Remove all non-digits, then take last 4
        const digitsOnly = contact.replace(/\D/g, '');
        const last4Digits = digitsOnly.slice(-4);

        // Pad with zeros if less than 4 digits (shouldn't happen, but safety)
        return last4Digits.padStart(4, '0');
      }

      // For email: fall back to normal OTP generation
      // (or you could use a static value like "123456")
    }

    // Generate OTP with configured length
    return generateOTP(config.length);
  }

  async getOTPExpiry(): Promise<number> {
    const config = await configService.getOTPConfig();
    return config.expirySeconds;
  }
}

// In Rate Limiter
class RateLimiter {
  async check(identifier: string, type: string): Promise<RateLimitResult> {
    const config = await configService.getRateLimitConfig();

    const limit = type === 'otp_request' ? config.otpRequestPerHour : config.ipPerHour;

    // Use configured limit
    return this.slidingWindow(identifier, limit, 3600);
  }
}
```

### Hardcoded OTP for Testing

**How It Works:**

- When `otp.hardcoded_enabled` is `true`:
  - **Phone numbers**: Uses last 4 digits of phone number as OTP
    - Example: `+11234567890` → OTP = `"7890"`
    - Example: `+919876543210` → OTP = `"3210"`
  - **Email**: Falls back to normal OTP generation (or uses static value)

**Benefits:**

- ✅ Easy to remember during testing (last 4 digits of your phone)
- ✅ No need to check email/SMS for OTP
- ✅ Works for any phone number automatically
- ✅ Different OTP per phone number

```typescript
// Development/Testing Configuration
async function setupTestConfig() {
  // Enable hardcoded OTP (uses last 4 digits of phone)
  await configService.set('otp.hardcoded_enabled', true, 'boolean');

  // Reduce expiry for faster testing
  await configService.set('otp.expiry_seconds', 60, 'number'); // 1 minute

  // Disable rate limiting for testing
  await configService.set('rate_limit.otp_request_per_hour', 999, 'number');
}

// Production Configuration
async function setupProductionConfig() {
  await configService.set('otp.hardcoded_enabled', false, 'boolean');
  await configService.set('otp.length', 6, 'number');
  await configService.set('otp.expiry_seconds', 600, 'number');
  await configService.set('rate_limit.otp_request_per_hour', 5, 'number');
}
```

**Example Usage:**

```typescript
// Test scenario
const phoneNumber = '+11234567890';
const otp = await otpService.generateOTP(phoneNumber, 'phone');
// Returns: "7890" (last 4 digits)

// User enters phone: +11234567890
// System generates OTP: "7890"
// User enters OTP: "7890"
// ✅ Verification succeeds!
```

### Configuration Management API (Optional)

```typescript
// src/routes/config.ts
router.get('/config', requireAuth, async (req, res) => {
  const category = req.query.category as string;

  const configs = await prisma.configuration.findMany({
    where: category ? { category } : { isActive: true },
  });

  res.json(configs);
});

router.put('/config/:key', requireAuth, async (req, res) => {
  const { key } = req.params;
  const { value, type } = req.body;
  const userId = req.session.userId;

  await configService.set(key, value, type, userId);

  res.json({ success: true });
});
```

### Benefits

1. ✅ **No Code Deployment** - Change settings without redeploying
2. ✅ **Environment-Specific** - Different configs for dev/staging/prod
3. ✅ **Testing Flexibility** - Enable hardcoded OTP for tests
4. ✅ **Runtime Updates** - Adjust limits based on traffic
5. ✅ **Audit Trail** - Track who changed what

### Configuration Values Summary

| Category       | Key                               | Default | Type    | Description                                                    |
| -------------- | --------------------------------- | ------- | ------- | -------------------------------------------------------------- |
| **OTP**        | `otp.length`                      | 6       | number  | OTP code length                                                |
|                | `otp.expiry_seconds`              | 600     | number  | OTP expiry time                                                |
|                | `otp.max_attempts`                | 3       | number  | Max verification attempts                                      |
|                | `otp.hardcoded_enabled`           | false   | boolean | Enable hardcoded OTP (uses last 4 digits of phone for testing) |
| **Rate Limit** | `rate_limit.otp_request_per_hour` | 5       | number  | OTP requests per hour                                          |
|                | `rate_limit.ip_per_hour`          | 10      | number  | Requests per IP per hour                                       |
|                | `rate_limit.verify_per_10min`     | 3       | number  | Verify attempts per 10 min                                     |
|                | `rate_limit.resend_seconds`       | 60      | number  | Resend timer                                                   |
| **Contact**    | `contact.default_country_code`    | "+1"    | string  | Default country code                                           |
|                | `contact.email_enabled`           | true    | boolean | Enable email auth                                              |
|                | `contact.phone_enabled`           | true    | boolean | Enable phone auth                                              |
| **Security**   | `security.session_ttl_seconds`    | 86400   | number  | Session expiry                                                 |
| **Feature**    | `feature.registration_enabled`    | true    | boolean | Enable registration                                            |
|                | `feature.login_enabled`           | true    | boolean | Enable login                                                   |
|                | `feature.sms_enabled`             | false   | boolean | Enable SMS delivery                                            |

---

## 🚀 Performance Requirements

### Must Meet

- ✅ OTP generation: < 10ms
- ✅ OTP verification: < 50ms
- ✅ Rate limit check: < 20ms
- ✅ Session creation: < 100ms

### Don't Need

- ❌ Sub-millisecond response times
- ❌ Caching beyond Redis
- ❌ CDN for static assets (if not needed)
- ❌ Database query optimization (beyond indexing)

---

## 📱 User Experience Requirements

### Must Have

- ✅ Clear error messages
- ✅ Loading states
- ✅ Countdown timers (resend OTP)
- ✅ Auto-focus on inputs
- ✅ Responsive design

### Don't Need

- ❌ Password strength meter (no passwords)
- ❌ Social login buttons
- ❌ Remember me checkbox
- ❌ Advanced form validation UI
- ❌ Multi-step wizard (except verification)

---

## 🔄 Flow Requirements

### Login Flow

```
1. User enters email OR phone
2. System sends OTP
3. User enters OTP
4. System verifies OTP
5. System creates session
6. User redirected to dashboard
```

### Registration Flow

```
1. User enters firstName, lastName
2. User enters email OR phone (or both)
3. System creates user (unverified)
4. System sends OTP to first contact
5. User verifies first contact
6. If second contact exists:
   - System sends OTP to second contact
   - User verifies second contact
7. System marks user as verified
8. User redirected to dashboard
```

### What We DON'T Have

- ❌ Email verification link
- ❌ Welcome email
- ❌ Password reset flow
- ❌ Account activation flow
- ❌ Two-step verification setup

---

## 📝 Code Standards

### Must Follow

- ✅ TypeScript strict mode
- ✅ Zod for validation
- ✅ Service layer pattern
- ✅ Error handling patterns
- ✅ Consistent naming conventions

### Don't Need

- ❌ Complex design patterns (unless needed)
- ❌ Over-engineering
- ❌ Microservices architecture
- ❌ Event-driven architecture
- ❌ GraphQL (REST is fine)

---

## 🧪 Testing Requirements

### Must Test

- ✅ OTP generation
- ✅ OTP verification
- ✅ Rate limiting
- ✅ Contact normalization
- ✅ Session creation
- ✅ Error cases

### Don't Need

- ❌ 100% code coverage (aim for 80%+)
- ❌ E2E tests for all flows (focus on critical paths)
- ❌ Performance testing (unless issues arise)
- ❌ Load testing (unless scaling)

---

## 📋 Feature Checklist

### Authentication

- [x] Email login
- [x] Phone login
- [x] Registration
- [x] OTP verification
- [x] Session management
- [ ] Password reset (NOT NEEDED)
- [ ] Social login (NOT NEEDED)

### OTP System

- [x] OTP generation
- [x] OTP expiry
- [x] OTP resend
- [x] Max attempts
- [x] Email delivery
- [ ] SMS delivery (TO BE IMPLEMENTED)
- [ ] Voice call delivery (NOT NEEDED)

### Rate Limiting

- [x] Per contact limit
- [x] Per IP limit
- [x] Verification attempts limit
- [x] Sliding window
- [ ] Dynamic limits (NOT NEEDED)
- [ ] IP whitelisting (NOT NEEDED)

### User Management

- [x] User creation
- [x] User lookup
- [x] Contact verification
- [ ] User update (NOT NEEDED)
- [ ] User deletion (NOT NEEDED)
- [ ] Profile management (NOT NEEDED)

### Configuration System

- [x] Database-stored configuration
- [x] Redis caching for performance
- [x] OTP configuration (length, expiry, hardcoded)
- [x] Rate limit configuration
- [x] Feature flags
- [x] Runtime configuration updates
- [ ] Admin UI for configuration (Optional)

---

## 🎨 UI/UX Requirements

### Must Have

- ✅ Clean, simple forms
- ✅ Clear error messages
- ✅ Loading indicators
- ✅ Countdown timers
- ✅ Responsive design

### Don't Need

- ❌ Complex animations
- ❌ Multi-theme support
- ❌ Accessibility features beyond basics
- ❌ Internationalization (i18n) - English only
- ❌ Dark mode toggle

---

## 📈 Monitoring & Logging

### Must Have

- ✅ Error logging
- ✅ OTP send failures
- ✅ Verification failures
- ✅ Rate limit violations

### Don't Need

- ❌ Real-time dashboards
- ❌ Advanced analytics
- ❌ User behavior tracking
- ❌ Performance metrics dashboard
- ❌ Alerting system

---

## 🔐 Security Checklist

### Implemented

- [x] OTP hashing
- [x] Rate limiting
- [x] Session security
- [x] Input validation
- [x] User enumeration prevention

### Not Needed

- [ ] CSRF protection (handled by framework)
- [ ] XSS protection (handled by framework)
- [ ] SQL injection (handled by Prisma)
- [ ] Advanced threat detection
- [ ] Security headers (use defaults)

---

## 📚 Documentation Requirements

### Must Have

- ✅ API documentation
- ✅ Code comments
- ✅ Architecture guide
- ✅ Setup instructions

### Don't Need

- ❌ User manuals
- ❌ Admin guides
- ❌ Video tutorials
- ❌ Complex diagrams

---

## 🚫 Explicitly Excluded Features

1. **Password authentication** - We're passwordless only
2. **Social login** - OTP only
3. **Magic links** - OTP codes only
4. **Biometric auth** - Not applicable for web
5. **2FA setup** - OTP IS our auth method
6. **Account recovery** - Handle via support if needed
7. **Email change** - Not in scope
8. **Phone change** - Not in scope
9. **Profile management** - Separate feature
10. **Admin dashboard** - Not in scope

---

## 📝 Decision Log

| Date       | Decision                     | Reason                   |
| ---------- | ---------------------------- | ------------------------ |
| YYYY-MM-DD | Use Redis + DB hybrid        | Fast + audit trail       |
| YYYY-MM-DD | Sliding window rate limiting | Prevents bursts          |
| YYYY-MM-DD | 6-digit OTP                  | Balance of security & UX |
| YYYY-MM-DD | 10-minute OTP expiry         | Enough time for user     |
| YYYY-MM-DD | 60-second resend timer       | Prevents spam            |

---

## 🎯 Success Criteria

### Must Achieve

- ✅ Users can login with email OR phone
- ✅ Users can register with at least one contact
- ✅ OTP verification works reliably
- ✅ Rate limiting prevents abuse
- ✅ Session management works correctly

### Nice to Have

- ⏳ Support for both email and phone registration
- ⏳ Sequential verification flow
- ⏳ Good error messages

---

## 📞 Questions to Resolve

1. **SMS Provider**: Which service to use? (Twilio recommended)
2. **Default Country**: What default country code? (+1 for US)
3. **Audit Retention**: How long to keep OTP audit logs? (Forever recommended)
4. **Error Handling**: How detailed should error messages be? (Generic recommended)
5. **Rate Limits**: Are current limits appropriate? (5/hour per contact)

---

## 🔄 Updates Log

| Date       | Version | Changes                 |
| ---------- | ------- | ----------------------- |
| 2024-01-XX | 1.0     | Initial design document |

---

**Last Updated**: [Date]
**Status**: ✅ Active
**Owner**: [Your Name/Team]
