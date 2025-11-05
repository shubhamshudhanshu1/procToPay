# Rate Limiting: Sliding Window Algorithm Explained

## What is Rate Limiting?

Rate limiting is like a bouncer at a club:

- **Purpose**: Prevent too many requests in a short time
- **Example**: "Only 5 requests per hour per user"

## Important Distinction: Rate Limiting vs OTP Expiry

**⚠️ These are TWO different things:**

1. **Rate Limiting** (Sliding Window) - Controls how often you can REQUEST an OTP
   - "You can request OTP 5 times per hour"
   - Handled by sliding window ✅

2. **OTP Expiry** - Controls how long an OTP CODE is valid
   - "Your OTP code expires in 10 minutes"
   - Still needs TTL/timer ❌ NOT handled by sliding window

3. **UI Resend Timer** - Shows countdown to user
   - "Resend OTP in 60 seconds"
   - User experience feature (prevents spam clicking)

**Answer: You still need OTP expiry timer!**

- Sliding window handles rate limiting (request frequency)
- You still need separate TTL for OTP validity (code expiry)

### ⚠️ Important: OTP Expiry vs Resend Timer

**These are DIFFERENT things:**

1. **OTP Expiry (10 minutes)** - How long the CODE is valid
   - "Your OTP code expires in 10 minutes"
   - Security feature
   - User can still USE the code during this time

2. **Resend Timer (60 seconds)** - When you can REQUEST a NEW OTP
   - "Resend OTP in 60 seconds"
   - UX feature (prevents spam clicking)
   - User must WAIT before requesting another code

**Why Different Times?**

```
OTP Expiry: 10 minutes (longer)
├─ Reason: User needs time to check email/SMS
├─ User might be busy, slow internet, etc.
└─ Security: Code should be valid long enough to use

Resend Timer: 60 seconds (shorter)
├─ Reason: Prevent spam clicking
├─ User clicks "Resend" button too quickly
└─ UX: Force user to wait, prevents server overload
```

**Example Scenario:**

```
10:00:00 AM → User requests OTP
              ├─ OTP Code: 123456
              ├─ OTP Expires: 10:10:00 AM (10 minutes)
              └─ Resend Available: 10:01:00 AM (60 seconds)

10:00:30 AM → User clicks "Resend" button
              └─ ❌ BLOCKED - "Please wait 30 more seconds"

10:01:00 AM → User clicks "Resend" button
              ├─ ✅ ALLOWED - 60 seconds passed
              ├─ New OTP Code: 789012
              ├─ New OTP Expires: 10:11:00 AM (10 minutes)
              └─ Resend Available: 10:02:00 AM (60 seconds)

10:05:00 AM → User enters OTP #1 (123456)
              └─ ✅ SUCCESS - Still valid (5 minutes old)

10:12:00 AM → User tries OTP #1 (123456)
              └─ ❌ FAILED - Expired (12 minutes old)

10:12:00 AM → User enters OTP #2 (789012)
              └─ ✅ SUCCESS - Still valid (11 minutes old)
```

**Visual Timeline:**

```
Timeline:
10:00 ────────────────────────────────────────────────────────── 10:15

OTP #1: 123456
├─ Requested: 10:00:00
├─ Expires:    10:10:00 (10 minutes) ← OTP EXPIRY
└─ Resend:     10:01:00 (60 seconds) ← RESEND TIMER
   │
   │ 10:00:30 → User clicks "Resend" ❌ Blocked (30s left)
   │ 10:01:00 → User clicks "Resend" ✅ Allowed
   │
   ▼
OTP #2: 789012
├─ Requested: 10:01:00
├─ Expires:    10:11:00 (10 minutes) ← OTP EXPIRY
└─ Resend:     10:02:00 (60 seconds) ← RESEND TIMER

User Actions:
├─ 10:05:00 → Verifies OTP #1 ✅ (still valid, 5 min old)
├─ 10:12:00 → Tries OTP #1 ❌ (expired, 12 min old)
└─ 10:12:00 → Verifies OTP #2 ✅ (still valid, 11 min old)
```

**Summary Table:**

| Timer Type       | Duration      | Purpose  | What It Controls              |
| ---------------- | ------------- | -------- | ----------------------------- |
| **OTP Expiry**   | 10 minutes    | Security | How long CODE is valid        |
| **Resend Timer** | 60 seconds    | UX       | When you can REQUEST new code |
| **Rate Limit**   | 1 hour window | Security | Total requests per hour       |

**Code Implementation:**

```typescript
// OTP Expiry (10 minutes)
async function generateOTP(contact: string): Promise<string> {
  const otp = generateOTP(6);
  const otpKey = `otp:${contact}:${otpId}`;

  // Store OTP with 10-minute expiry
  await redis.setex(otpKey, 600, JSON.stringify({ hash: hashedOTP }));
  //                          ↑
  //                    10 minutes TTL

  return otp;
}

// Resend Timer (60 seconds) - Separate check
async function canResendOTP(contact: string): Promise<boolean> {
  const resendKey = `resend:${contact}`;
  const lastSent = await redis.get(resendKey);

  if (!lastSent) {
    return true; // First request, allowed
  }

  const timeSinceLastSent = Date.now() - parseInt(lastSent);
  return timeSinceLastSent >= 60000; // 60 seconds
}

async function requestOTP(contact: string): Promise<string> {
  // Check resend timer (60 seconds)
  if (!(await canResendOTP(contact))) {
    throw new Error('Please wait 60 seconds before requesting again');
  }

  // Check rate limit (sliding window)
  if (!(await checkRateLimit(contact))) {
    throw new Error('Too many requests. Try again later.');
  }

  // Generate OTP (10-minute expiry)
  const otp = await generateOTP(contact);

  // Store resend timestamp
  await redis.setex(`resend:${contact}`, 60, Date.now().toString());
  //                           ↑
  //                    60 seconds TTL

  return otp;
}
```

### How They Work Together

**Example Flow:**

```
User Flow:
1. Request OTP at 10:00 AM
   ├─ Rate Limiting: ✅ Check sliding window (5/hour limit)
   ├─ Generate OTP: 123456
   ├─ Store OTP: Redis SET with TTL (10 minutes)
   └─ Send OTP: Email/SMS

2. User tries to verify at 10:05 AM
   ├─ Check OTP expiry: ✅ Still valid (5 minutes old)
   └─ Verify: ✅ Success

3. User tries to verify at 10:11 AM
   ├─ Check OTP expiry: ❌ Expired (11 minutes old)
   └─ Verify: ❌ Failed - "OTP expired"

4. User requests new OTP at 10:15 AM
   ├─ Rate Limiting: ✅ Check sliding window
   ├─ Generate OTP: 789012
   ├─ Store OTP: Redis SET with TTL (10 minutes)
   └─ Send OTP: Email/SMS
```

**Code Implementation:**

```typescript
// 1. RATE LIMITING (Sliding Window)
async function checkRateLimit(contact: string): Promise<boolean> {
  const key = `rate:${contact}`;
  const now = Date.now();
  const windowStart = now - 3600000; // 1 hour ago

  // Remove expired from window
  await redis.zremrangebyscore(key, 0, windowStart);

  // Count current
  const count = await redis.zcard(key);

  // Check limit
  if (count >= 5) {
    return false; // Rate limit exceeded
  }

  // Add to window
  const uuid = randomUUID();
  await redis.zadd(key, now, `${now}-${uuid}`);
  await redis.expire(key, 3600);

  return true; // Allowed
}

// 2. OTP EXPIRY (Separate TTL)
async function generateAndStoreOTP(contact: string): Promise<string> {
  const otp = generateOTP(6); // e.g., "123456"
  const otpId = randomUUID();
  const hashedOTP = hashOTP(contact, otp);

  // Store OTP with TTL (10 minutes)
  const otpKey = `otp:${contact}:${otpId}`;
  await redis.setex(
    otpKey,
    600, // 10 minutes TTL
    JSON.stringify({
      hash: hashedOTP,
      createdAt: Date.now(),
    })
  );

  return otp; // Send this to user
}

// 3. VERIFY OTP (Check expiry)
async function verifyOTP(contact: string, otpId: string, otp: string): Promise<boolean> {
  const otpKey = `otp:${contact}:${otpId}`;
  const stored = await redis.get(otpKey);

  if (!stored) {
    return false; // OTP expired or doesn't exist
  }

  const data = JSON.parse(stored);
  return verifyOTP(contact, otp, data.hash);
}
```

### 📦 OTP Storage: Where to Store OTPs?

**Best Practice: Hybrid Approach (Redis + Database)**

**Storage Strategy:**

```
┌─────────────────────────────────────────────────────────────┐
│                    OTP STORAGE STRATEGY                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRIMARY STORAGE: Redis (Fast Lookup + Auto-Expiry)        │
│  ├─ Purpose: Fast verification                             │
│  ├─ TTL: 10 minutes (automatic cleanup)                    │
│  └─ Data: Hashed OTP + metadata                            │
│                                                             │
│  AUDIT TRAIL: Database (Optional, for compliance)          │
│  ├─ Purpose: Logging, analytics, compliance               │
│  ├─ Retention: Permanent or configurable                   │
│  └─ Data: Hashed OTP + timestamps + status                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Three Approaches:**

#### Option 1: Redis Only (Simple, Fast) ✅ Recommended for Most Cases

**Pros:**

- ✅ Fast lookups (microseconds)
- ✅ Automatic expiry (no cleanup needed)
- ✅ Simple implementation
- ✅ Low memory usage
- ✅ Perfect for high traffic

**Cons:**

- ❌ No audit trail
- ❌ Can't analyze failed attempts
- ❌ No compliance logging

**Use When:**

- High-performance requirements
- No compliance needs
- Simple use cases

**Code:**

```typescript
// Store in Redis only
async function storeOTP(contact: string, contactType: string, otp: string): Promise<string> {
  const otpId = randomUUID();
  const hashedOTP = hashOTP(contact, otp);

  const otpKey = `otp:${contactType}:${contact}:${otpId}`;
  await redis.setex(
    otpKey,
    600, // 10 minutes TTL
    JSON.stringify({
      hash: hashedOTP,
      createdAt: Date.now(),
      contactType,
      attempts: 0,
    })
  );

  return otpId;
}
```

#### Option 2: Redis + Database (Hybrid) ✅ Best Practice

**Pros:**

- ✅ Fast verification (Redis)
- ✅ Audit trail (Database)
- ✅ Compliance ready
- ✅ Analytics capabilities
- ✅ Best of both worlds

**Cons:**

- ⚠️ More complex
- ⚠️ Two writes (slight performance hit)

**Use When:**

- Need compliance/audit
- Want analytics
- Security-sensitive applications
- Enterprise applications

**Code:**

```typescript
// Store in both Redis (primary) and Database (audit)
async function storeOTP(contact: string, contactType: string, otp: string): Promise<string> {
  const otpId = randomUUID();
  const hashedOTP = hashOTP(contact, otp);
  const now = new Date();

  // 1. PRIMARY: Store in Redis (fast lookup)
  const otpKey = `otp:${contactType}:${contact}:${otpId}`;
  await redis.setex(
    otpKey,
    600, // 10 minutes TTL
    JSON.stringify({
      hash: hashedOTP,
      createdAt: Date.now(),
      contactType,
      attempts: 0,
    })
  );

  // 2. AUDIT: Store in Database (optional, async)
  prisma.oTPToken
    .create({
      data: {
        id: otpId,
        contact,
        contactType,
        tokenHash: hashedOTP, // NEVER store plain OTP!
        attempts: 0,
        maxAttempts: 3,
        expiresAt: new Date(now.getTime() + 600 * 1000),
        status: 'pending',
      },
    })
    .catch((err) => {
      // Log error but don't fail the request
      console.error('Failed to log OTP to database:', err);
    });

  return otpId;
}
```

#### Option 3: Database Only ❌ Not Recommended

**Pros:**

- ✅ Single source of truth
- ✅ Easy to query/analyze

**Cons:**

- ❌ Slow (database queries)
- ❌ Manual cleanup needed
- ❌ Poor performance at scale
- ❌ Database load

**Never use for primary storage!**

**Why Redis is Better:**

```
Performance Comparison:
┌─────────────────────────────────────────┐
│ Operation    │ Redis │ Database │ Speed │
├─────────────────────────────────────────┤
│ Write OTP    │ 0.1ms │ 5-10ms   │ 50x   │
│ Read OTP     │ 0.1ms │ 5-10ms   │ 50x   │
│ Auto Expiry  │ ✅    │ ❌       │ Yes   │
│ Cleanup      │ ✅    │ Manual   │ Yes   │
└─────────────────────────────────────────┘
```

**What to Store:**

```typescript
// ✅ GOOD: Store hashed OTP
{
  hash: "a1b2c3d4e5f6...", // HMAC-SHA256 hash
  createdAt: 1633025000000,
  contactType: "email",
  attempts: 0,
  maxAttempts: 3,
}

// ❌ BAD: Never store plain OTP!
{
  otp: "123456", // NEVER DO THIS!
  ...
}
```

**Complete Best Practice Implementation:**

```typescript
class OTPService {
  /**
   * Generate and store OTP (Hybrid approach)
   */
  async generateAndStore(
    contact: string,
    contactType: 'email' | 'phone',
    ipHash?: string,
    uaHash?: string
  ): Promise<{ otpId: string; otp: string }> {
    const otp = generateOTP(6);
    const otpId = randomUUID();
    const hashedOTP = hashOTP(contact, otp);
    const now = Date.now();
    const expiresAt = new Date(now + 600 * 1000); // 10 minutes

    // 1. PRIMARY: Redis (fast lookup)
    const redisKey = `otp:${contactType}:${contact}:${otpId}`;
    await redis.setex(
      redisKey,
      600, // 10 minutes TTL
      JSON.stringify({
        hash: hashedOTP,
        createdAt: now,
        contactType,
        attempts: 0,
        maxAttempts: 3,
      })
    );

    // 2. AUDIT: Database (async, don't block)
    prisma.oTPToken
      .create({
        data: {
          id: otpId,
          contact,
          contactType,
          tokenHash: hashedOTP, // Hashed only!
          attempts: 0,
          maxAttempts: 3,
          expiresAt,
          ipHash,
          uaHash,
          status: 'pending',
        },
      })
      .catch((err) => {
        // Log but don't fail - Redis is primary
        console.error('OTP audit log failed:', err);
      });

    return { otpId, otp };
  }

  /**
   * Verify OTP (check Redis first, then update DB)
   */
  async verify(
    contact: string,
    contactType: 'email' | 'phone',
    otpId: string,
    otp: string
  ): Promise<{ valid: boolean; attemptsRemaining: number }> {
    // 1. PRIMARY: Check Redis (fast)
    const redisKey = `otp:${contactType}:${contact}:${otpId}`;
    const redisData = await redis.get(redisKey);

    if (!redisData) {
      // Update DB audit
      await this.logFailedAttempt(otpId, 'expired');
      return { valid: false, attemptsRemaining: 0 };
    }

    const data = JSON.parse(redisData);
    const attempts = data.attempts || 0;

    // Check max attempts
    if (attempts >= data.maxAttempts) {
      await redis.del(redisKey);
      await this.logFailedAttempt(otpId, 'max_attempts');
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
        where: { id: otpId },
        data: { attempts: attempts + 1 },
      });

      return {
        valid: false,
        attemptsRemaining: data.maxAttempts - attempts - 1,
      };
    }

    // Valid OTP - mark as used
    await redis.del(redisKey);

    // Update DB
    await prisma.oTPToken.updateMany({
      where: { id: otpId },
      data: {
        status: 'verified',
        usedAt: new Date(),
      },
    });

    return { valid: true, attemptsRemaining: 0 };
  }

  private async logFailedAttempt(otpId: string, reason: string): Promise<void> {
    prisma.oTPToken
      .updateMany({
        where: { id: otpId },
        data: { status: 'failed', failedReason: reason },
      })
      .catch(() => {
        // Silently fail - audit logging shouldn't break flow
      });
  }
}
```

**Storage Comparison:**

| Storage        | Primary | Audit | Speed  | Auto-Expiry | Best For                 |
| -------------- | ------- | ----- | ------ | ----------- | ------------------------ |
| **Redis Only** | ✅      | ❌    | ⚡⚡⚡ | ✅          | High performance, simple |
| **Redis + DB** | ✅      | ✅    | ⚡⚡   | ✅          | **Best Practice** ✅     |
| **DB Only**    | ❌      | ✅    | ⚡     | ❌          | Never use                |

**Security Considerations:**

1. ✅ **Always hash OTPs** - Never store plain text
2. ✅ **Use Redis TTL** - Automatic cleanup
3. ✅ **Store in DB** - Only for audit, not for verification
4. ✅ **Separate keys** - Different Redis keys per contact
5. ✅ **Rate limit** - Combined with sliding window

**Recommendation:**

**Use Redis + Database (Hybrid)** for production:

- Redis for fast verification (primary)
- Database for audit trail (secondary)
- Best balance of performance and compliance

**Visual Comparison:**

```
┌─────────────────────────────────────────────────────────────┐
│                    SLIDING WINDOW                           │
│              (Rate Limiting - Request Frequency)            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Key: "rate:email:user@example.com"                        │
│                                                             │
│  Purpose: Track how many OTP REQUESTS made                 │
│  Limit: 5 requests per hour                                │
│  TTL: 1 hour (window duration)                             │
│                                                             │
│  Redis Sorted Set:                                         │
│  ┌─────────────────────────────────────┐                   │
│  │ Score: 1633021400000                │ ← Request #1     │
│  │ Score: 1633021800000                │ ← Request #2     │
│  │ Score: 1633022700000                │ ← Request #3     │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  Usage: "Can user request another OTP?"                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OTP EXPIRY                                │
│              (Code Validity - Separate TTL)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Key: "otp:email:user@example.com:{otpId}"                │
│                                                             │
│  Purpose: Store actual OTP code with expiry                │
│  Validity: 10 minutes per OTP                              │
│  TTL: 10 minutes (code expiry)                             │
│                                                             │
│  Redis String:                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ Value: { hash: "...", createdAt }  │                   │
│  │ TTL: 600 seconds                    │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  Usage: "Is this OTP code still valid?"                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SUMMARY                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Sliding Window:                                            │
│  ✅ Handles: "How often can you REQUEST OTP?"             │
│  ✅ Purpose: Prevent spam/abuse                            │
│  ✅ Duration: 1 hour window                                │
│                                                             │
│  OTP Expiry:                                                │
│  ✅ Handles: "How long is OTP CODE valid?"                │
│  ✅ Purpose: Security (expired codes shouldn't work)       │
│  ✅ Duration: 10 minutes per code                          │
│                                                             │
│  BOTH ARE NEEDED!                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Real-World Scenario:**

```
Timeline:
10:00 AM → User requests OTP #1
           ├─ Rate Limit: ✅ Allowed (1st request)
           ├─ Generate OTP: 123456
           └─ Store OTP: TTL = 10 minutes (expires 10:10 AM)

10:05 AM → User requests OTP #2 (first OTP not used)
           ├─ Rate Limit: ✅ Allowed (2nd request)
           ├─ Generate OTP: 789012
           └─ Store OTP: TTL = 10 minutes (expires 10:15 AM)

10:08 AM → User tries to verify OTP #1
           ├─ OTP Expiry: ✅ Still valid (8 minutes old)
           └─ Verify: ✅ Success

10:12 AM → User tries to verify OTP #2
           ├─ OTP Expiry: ❌ Expired (12 minutes old, but only 7 min since generation)
           └─ Verify: ❌ Failed - "OTP expired"

10:20 AM → User requests OTP #3
           ├─ Rate Limit: ✅ Allowed (3rd request, still within 1 hour)
           ├─ Generate OTP: 345678
           └─ Store OTP: TTL = 10 minutes

10:25 AM → User requests OTP #4
           ├─ Rate Limit: ✅ Allowed (4th request)

10:30 AM → User requests OTP #5
           ├─ Rate Limit: ✅ Allowed (5th request)

10:35 AM → User requests OTP #6
           ├─ Rate Limit: ❌ BLOCKED (6th request in 1 hour)
           └─ Error: "Too many requests. Try again later."
```

**Key Points:**

1. ✅ **Sliding Window** = Rate limiting (request frequency)
2. ✅ **OTP TTL** = Code expiry (how long code is valid)
3. ✅ **Both are separate** and both are needed
4. ✅ **Different Redis keys** for different purposes
5. ✅ **Different TTLs** for different purposes

## Types of Rate Limiting Algorithms

### 1. Fixed Window (Simple but Unfair)

**What is Fixed Window?**

Think of it like a **calendar with fixed hours**. Each hour is a separate "bucket" that starts fresh.

**Simple Analogy:**

Imagine you have a **cafeteria with lunch tokens**:

- Rule: "5 tokens per hour"
- Each hour, you get a **fresh new set of 5 tokens**
- At 1:00 PM sharp, old tokens disappear, new tokens appear
- Problem: You can use 5 tokens at 12:59 PM, then 5 MORE tokens at 1:01 PM
- Result: 10 tokens used in 2 minutes!

**How it works:**

```
Rule: "You can make 5 requests per hour"

Hour 1: 00:00 - 01:00 → Counter starts at 0
  - Make request at 00:10 → Counter = 1 ✅
  - Make request at 00:20 → Counter = 2 ✅
  - Make request at 00:30 → Counter = 3 ✅
  - Make request at 00:40 → Counter = 4 ✅
  - Make request at 00:50 → Counter = 5 ✅
  - Make request at 00:55 → Counter = 6 ❌ BLOCKED (limit reached)

Hour 2: 01:00 - 02:00 → Counter RESETS to 0!
  - Counter magically goes back to 0
  - Now you can make 5 MORE requests
```

**The Problem - Burst Attack:**

Here's the issue: At the **exact moment** the hour changes, you can abuse the system!

**Attack Scenario:**

```
Timeline:
┌─────────────────────────────────────────────────────────┐
│                   00:00 - 01:00                         │
│                    Hour 1 Window                        │
│                                                         │
│  00:59:00 → Request #1 ✅                              │
│  00:59:10 → Request #2 ✅                               │
│  00:59:20 → Request #3 ✅                               │
│  00:59:30 → Request #4 ✅                               │
│  00:59:40 → Request #5 ✅                               │
│                                                         │
│  Counter = 5 (limit reached)                           │
└─────────────────────────────────────────────────────────┘
                        ↓
                ⏰ 01:00:00 ⏰
                    COUNTER RESETS!
                        ↓
┌─────────────────────────────────────────────────────────┐
│                   01:00 - 02:00                         │
│                    Hour 2 Window                        │
│                                                         │
│  01:00:01 → Request #6 ✅ (NEW counter = 1)            │
│  01:00:10 → Request #7 ✅ (counter = 2)                │
│  01:00:20 → Request #8 ✅ (counter = 3)                │
│  01:00:30 → Request #9 ✅ (counter = 4)                │
│  01:00:40 → Request #10 ✅ (counter = 5)               │
│                                                         │
│  Counter = 5 (limit reached again)                     │
└─────────────────────────────────────────────────────────┘

RESULT: 10 requests in just 1 MINUTE and 40 SECONDS! ❌
Expected: Only 5 requests per hour
Actual: 10 requests in less than 2 minutes

This is a SECURITY PROBLEM!
```

**Visual Example:**

```
Fixed Window (Hourly) - Like Separate Buckets:

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   00:00-01:00    │  │   01:00-02:00    │  │   02:00-03:00    │
│                  │  │                  │  │                  │
│  [●●●●●]        │  │  [●●●●●]        │  │  [●●●●●]        │
│  5 requests      │  │  5 requests      │  │  5 requests      │
│                  │  │                  │  │                  │
│  At 00:59:59    │  │  At 01:00:00    │  │  At 02:00:00    │
│  Counter = 5     │  │  Counter = 0    │  │  Counter = 0    │
│                  │  │  ✨ RESET! ✨    │  │  ✨ RESET! ✨    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         ↑                      ↑                      ↑
    Can burst here!       Can burst here!       Can burst here!
```

**Real-World Example:**

Imagine you're trying to prevent spam:

```
Fixed Window Problem:

Spammer's Strategy:
┌─────────────────────────────────────────────────────────┐
│  11:59:50 PM → Send 5 spam emails ✅                    │
│  11:59:51 PM → Send 5 spam emails ✅                    │
│  11:59:52 PM → Send 5 spam emails ✅                    │
│  11:59:53 PM → Send 5 spam emails ✅                    │
│  11:59:54 PM → Send 5 spam emails ✅                    │
│                      ↓                                  │
│              ⏰ MIDNIGHT ⏰                             │
│              Counter Resets!                           │
│                      ↓                                  │
│  12:00:01 AM → Send 5 MORE spam emails ✅             │
│  12:00:02 AM → Send 5 MORE spam emails ✅              │
│                                                         │
│  Result: 10 spam emails in 12 seconds!                 │
│  Rate limit FAILED! ❌                                 │
└─────────────────────────────────────────────────────────┘
```

**Why This Happens:**

Fixed window treats each hour as **completely separate**. It doesn't remember what happened in the previous hour at the boundary.

**Code Example:**

```typescript
// Fixed Window Implementation
function checkRateLimit(userId: string) {
  // Get current hour (e.g., "2024-01-15-14")
  const hour = new Date().toISOString().slice(0, 13); // "2024-01-15T14"
  const key = `rate:${userId}:${hour}`;

  // Count requests in THIS hour only
  const count = redis.incr(key);

  // Set expiry for this hour
  if (count === 1) {
    redis.expire(key, 3600); // Expires at end of hour
  }

  return count <= 5; // Allow if ≤ 5 in THIS hour
}

// Problem:
// At 11:59:59 → count = 5 ✅
// At 12:00:01 → NEW hour, NEW key, count = 1 ✅
// Result: 6 requests in 2 seconds!
```

**Summary of Fixed Window Problem:**

1. ❌ **Burst Attacks**: Can make 2x limit at boundaries
2. ❌ **Unfair**: User gets different limits depending on timing
3. ❌ **Security Risk**: Easy to bypass rate limiting
4. ❌ **Not Smooth**: Allows spikes, then blocks everything

**This is why we need Sliding Window!**

### 2. Sliding Window (Fair and Accurate)

**How it works:**

```
Instead of fixed hour blocks, track requests in a rolling window
Always look at the last 1 hour from NOW
```

**Example:**

```
Current time: 01:30
Look back: 00:30 - 01:30 (last 1 hour)
Count requests in this window
```

**Visual Example:**

```
Sliding Window (Always Last Hour):
                    Current Time: 01:30
                           ↓
        ┌─────────────────────────────┐
        │  Looking at last 1 hour    │
        │  00:30 ──────────── 01:30  │
        │  [●●●●●] = 5 requests      │
        └─────────────────────────────┘

At 01:31:
        ┌─────────────────────────────┐
        │  00:31 ──────────── 01:31  │
        │  [●●●●] = 4 requests       │
        └─────────────────────────────┘
              ↑
          Old request expired
```

## Sliding Window Implementation in Redis

### Method 1: Sorted Sets (ZSET) - Recommended

**How it works:**

```
Redis Sorted Set stores: timestamp → request_id
Example:
  Key: "rate:email:user@example.com"
  Values:
    "1633024800000-abc123" → score: 1633024800000
    "1633024860000-def456" → score: 1633024860000
    "1633024920000-ghi789" → score: 1633024920000
```

**Step-by-Step Process:**

```typescript
// 1. Get current time
const now = Date.now(); // e.g., 1633025000000

// 2. Calculate window start (1 hour ago)
const windowStart = now - 60 * 60 * 1000; // 1633021400000

// 3. Remove expired entries (before window start)
await redis.zremrangebyscore(key, 0, windowStart);
// Removes all entries with score < 1633021400000
// ⚠️ IMPORTANT: zremrangebyscore works on SCORE, not member value!
// Even with UUID in member, this works perfectly because score is still timestamp

// 4. Count current requests in window
const count = await redis.zcard(key);
// Returns: 3 (requests in last hour)

// 5. Check if limit exceeded
if (count >= 5) {
  return { allowed: false };
}

// 6. Add current request
await redis.zadd(key, now, `${now}-${Math.random()}`);
// Adds: score=1633025000000, value="1633025000000-0.123"

// ⚠️ Why Math.random()?
// Redis Sorted Sets require UNIQUE values (members)
// If two requests happen at the EXACT same millisecond:
//   - Without random: "1633025000000-abc" + "1633025000000-abc" = DUPLICATE ❌
//   - With random: "1633025000000-0.123" + "1633025000000-0.456" = UNIQUE ✅
//
// However, Math.random() is NOT ideal for production!
// Better alternatives below ↓

// 7. Set expiry (cleanup)
await redis.expire(key, 3600); // 1 hour
```

**Why Math.random()? - Detailed Explanation**

### The Problem: Redis Sorted Sets Need Unique Values

Redis Sorted Sets have a rule: **Each member (value) must be unique**. If you try to add a duplicate value, Redis will either:

- Ignore it (update the score only)
- Overwrite the existing entry

**Example of the Problem:**

```typescript
// ❌ BAD: Without uniqueness
const timestamp = Date.now(); // e.g., 1633025000000

// Request 1 at exact same millisecond
await redis.zadd(key, timestamp, `request-${timestamp}`);
// Value: "request-1633025000000"

// Request 2 at exact same millisecond (race condition!)
await redis.zadd(key, timestamp, `request-${timestamp}`);
// Value: "request-1633025000000" ← DUPLICATE!

// Result: Only 1 entry instead of 2!
// Count is wrong, rate limiting fails!
```

**When This Happens:**

1. **High traffic**: Multiple requests at same millisecond
2. **Race conditions**: Concurrent requests
3. **Precise timing**: System clock issues

### Why Math.random() "Works" (But Isn't Ideal)

```typescript
// ✅ WORKS: With Math.random()
const timestamp = Date.now();
const unique = Math.random(); // e.g., 0.123456789

await redis.zadd(key, timestamp, `${timestamp}-${unique}`);
// Value: "1633025000000-0.123456789" ← Unique!

// Even if timestamp is same, random makes it unique
await redis.zadd(key, timestamp, `${timestamp}-${Math.random()}`);
// Value: "1633025000000-0.987654321" ← Different!
```

**Problems with Math.random():**

1. ❌ **Not cryptographically secure**: Predictable patterns
2. ❌ **Potential collisions**: Very rare, but possible
3. ❌ **No ordering**: Can't track request order
4. ❌ **Debugging difficulty**: Hard to trace requests

### Better Alternatives

#### Option 1: UUID (Recommended for Production)

```typescript
import { randomUUID } from 'crypto';

const timestamp = Date.now();
const requestId = randomUUID(); // e.g., "550e8400-e29b-41d4-a716-446655440000"

await redis.zadd(key, timestamp, `${timestamp}-${requestId}`);
// Value: "1633025000000-550e8400-e29b-41d4-a716-446655440000"
// ✅ Guaranteed unique
// ✅ Can track individual requests
// ✅ Better for debugging
```

#### Option 2: Counter + Timestamp

```typescript
// Get current count
const count = await redis.zcard(key);
const requestId = `${timestamp}-${count + 1}`;

await redis.zadd(key, timestamp, requestId);
// Value: "1633025000000-5" (5th request)
// ✅ Unique (count always increments)
// ✅ Shows request order
// ✅ Simple and efficient
```

#### Option 3: Request ID from Request

```typescript
// If you have request IDs in your system
const requestId = req.headers['x-request-id'] || randomUUID();
await redis.zadd(key, timestamp, `${timestamp}-${requestId}`);
// ✅ Uses existing request tracking
// ✅ Better observability
```

#### Option 4: Microsecond Precision

```typescript
// Use microsecond precision for timestamp
const timestamp = `${Date.now()}-${process.hrtime.bigint()}`;
// e.g., "1633025000000-1234567890123456"

await redis.zadd(key, Date.now(), timestamp);
// ✅ Very unlikely to collide
// ✅ Maintains ordering
```

### Production-Ready Code

```typescript
import { randomUUID } from 'crypto';

async function addRequestToWindow(key: string, now: number): Promise<void> {
  // Use UUID for guaranteed uniqueness
  const requestId = randomUUID();
  const member = `${now}-${requestId}`;

  await redis.zadd(key, now, member);

  // Optional: Store metadata for debugging
  await redis.setex(
    `request:${requestId}`,
    3600,
    JSON.stringify({
      timestamp: now,
      key,
    })
  );
}
```

### Summary

| Method          | Pros                      | Cons                            | Use Case               |
| --------------- | ------------------------- | ------------------------------- | ---------------------- |
| `Math.random()` | Simple                    | Not secure, collisions possible | Learning/Prototyping   |
| `UUID`          | Guaranteed unique, secure | Slightly longer values          | **Production** ✅      |
| Counter         | Shows order, simple       | Needs atomic counter            | High-performance needs |
| Request ID      | Good observability        | Requires request tracking       | Microservices          |

**Recommendation**: Use **UUID** for production code!

### How zremrangebyscore Works with UUID

**Key Concept: Redis Sorted Sets have TWO parts:**

1. **Score** (used for sorting and range queries)
2. **Member** (the actual value, must be unique)

**When you do `zadd`:**

```typescript
await redis.zadd(key, SCORE, MEMBER);
//              ↑      ↑      ↑
//            key   score  member value
```

**Example with UUID:**

```typescript
const timestamp = 1633025000000; // Score
const uuid = '550e8400-e29b-41d4-a716-446655440000'; // Member
await redis.zadd(key, timestamp, `${timestamp}-${uuid}`);
//                                    ↑
//                              This is the MEMBER
//                              Score is still timestamp!
```

**Visual Representation:**

```
Redis Sorted Set Structure:
┌─────────────────────────────────────────────────────────┐
│ Key: "rate:email:user@example.com"                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  SCORE (for sorting)    │    MEMBER (unique value)    │
│  ───────────────────────┼─────────────────────────── │
│  1633021400000          │  "1633021400000-uuid-1"     │
│  1633021800000          │  "1633021800000-uuid-2"     │
│  1633022700000          │  "1633022700000-uuid-3"     │
│  1633023300000          │  "1633023300000-uuid-4"     │
│  1633025000000          │  "1633025000000-uuid-5"     │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↑                              ↑
    Used for range            Used for uniqueness
    queries (zremrange)       (no duplicates)
```

**How `zremrangebyscore` Works:**

```typescript
// Remove entries where score is between 0 and windowStart
await redis.zremrangebyscore(key, 0, windowStart);
//                                      ↑
//                            Only looks at SCORE column!
//                            Doesn't care about member value!
```

**Step-by-Step Example:**

```typescript
// Current time: 1633025000000 (01:30:00)
// Window start: 1633021400000 (00:30:00) (1 hour ago)

// Our sorted set has:
// Score: 1633020600000, Member: "1633020600000-uuid-abc" ← 00:10 (expired!)
// Score: 1633021800000, Member: "1633021800000-uuid-def" ← 00:30 ✅
// Score: 1633022700000, Member: "1633022700000-uuid-ghi" ← 00:45 ✅
// Score: 1633023300000, Member: "1633023300000-uuid-jkl" ← 00:55 ✅
// Score: 1633025000000, Member: "1633025000000-uuid-mno" ← 01:30 ✅

// Execute:
await redis.zremrangebyscore(key, 0, 1633021400000);

// Redis checks:
// - Score 1633020600000 <= 1633021400000? ✅ YES → REMOVE
// - Score 1633021800000 <= 1633021400000? ❌ NO → KEEP
// - Score 1633022700000 <= 1633021400000? ❌ NO → KEEP
// - Score 1633023300000 <= 1633021400000? ❌ NO → KEEP
// - Score 1633025000000 <= 1633021400000? ❌ NO → KEEP

// Result: Only expired entry removed!
// Member value (with UUID) doesn't matter at all!
```

**Why This Works:**

1. ✅ **Score is timestamp**: Used for sorting and range queries
2. ✅ **Member has UUID**: Ensures uniqueness
3. ✅ **zremrangebyscore only looks at score**: Doesn't care about member value
4. ✅ **Perfect combination**: Uniqueness + efficient cleanup

**Complete Example with UUID:**

```typescript
import { randomUUID } from 'crypto';

async function slidingWindowRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Step 1: Remove expired (by score, not member!)
  await redis.zremrangebyscore(key, 0, windowStart);
  // ✅ Works perfectly even with UUID in member!

  // Step 2: Count current
  const count = await redis.zcard(key);

  // Step 3: Check limit
  if (count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  // Step 4: Add current request
  const uuid = randomUUID();
  await redis.zadd(key, now, `${now}-${uuid}`);
  //                    ↑    ↑
  //                 score  member
  //                 (used for (ensures uniqueness)
  //                  cleanup)

  // Step 5: Set expiry
  await redis.expire(key, Math.ceil(windowMs / 1000));

  return { allowed: true, remaining: limit - count - 1 };
}
```

**Key Takeaway:**

```
zremrangebyscore(key, min, max)
     ↓
Removes entries where:
  min ≤ SCORE ≤ max

It doesn't look at MEMBER value at all!

So UUID in member = ✅ Perfect for uniqueness
Timestamp as score = ✅ Perfect for cleanup
```

**Visual Example:**

```
Timeline:
00:00 ───────────────────────────────── 01:00 ──────────────── 02:00

Requests made:
  ● (00:10)
  ● (00:30)
  ● (00:45)
  ● (00:55)
  ● (01:05) ← Current time

At 01:05, checking rate limit:
┌─────────────────────────────────────┐
│ Window: 00:05 - 01:05 (last hour)   │
│ Count: 4 requests                   │
│ Limit: 5                            │
│ Allowed: ✅ Yes                     │
└─────────────────────────────────────┘

Redis Sorted Set:
  Key: "rate:email:user@example.com"
  ┌─────────────────────────────┐
  │ Score: 1633020600000        │ ← 00:10 (expired, removed)
  │ Score: 1633021800000        │ ← 00:30 ✅
  │ Score: 1633022700000        │ ← 00:45 ✅
  │ Score: 1633023300000        │ ← 00:55 ✅
  │ Score: 1633023900000        │ ← 01:05 ✅ (just added)
  └─────────────────────────────┘
```

### Method 2: Simple Counter (Less Accurate)

**How it works:**

```
Use INCR with expiry
Key: "rate:email:user@example.com:1633025" (hour-based key)
Value: counter
```

**Problem:**

- Less precise (can still burst at boundary)
- But simpler and faster

## Real-World Example

### Scenario: Email OTP Rate Limiting

**Requirement:** "User can request OTP 5 times per hour"

**What happens:**

```
10:00 AM - User requests OTP #1 ✅
           Redis: count = 1

10:15 AM - User requests OTP #2 ✅
           Redis: count = 2

10:30 AM - User requests OTP #3 ✅
           Redis: count = 3

10:45 AM - User requests OTP #4 ✅
           Redis: count = 4

11:00 AM - User requests OTP #5 ✅
           Redis: count = 5

11:05 AM - User requests OTP #6 ❌
           Check: requests in last hour (10:05-11:05) = 5
           Result: BLOCKED (limit reached)

11:15 AM - User requests OTP #7 ✅
           Check: requests in last hour (10:15-11:15) = 4
           (10:00 request expired from window)
           Result: ALLOWED
```

## Why Sliding Window is Better

### 1. **Fair Distribution**

```
Fixed Window:
  Request 5 at 00:59 → Allowed
  Request 5 at 01:01 → Allowed
  = 10 requests in 2 minutes ❌

Sliding Window:
  Request 5 at 00:59 → Allowed
  Request 5 at 01:01 → Blocked (5 in last hour)
  = Fair distribution ✅
```

### 2. **Prevents Burst Attacks**

```
Attacker tries to send 100 requests at once:

Fixed Window:
  00:59 → Send 100 requests ✅ (all allowed if within limit)

Sliding Window:
  00:59 → Send 100 requests ❌ (only 5 allowed)
```

### 3. **Smooth Rate Limiting**

```
User makes requests throughout the hour:
  00:00, 00:15, 00:30, 00:45, 01:00, 01:15

Fixed Window:
  Can burst at boundaries

Sliding Window:
  Smooth, consistent rate ✅
```

## Code Comparison

### Fixed Window (Simple)

```typescript
// Bad: Allows bursts
const hour = Math.floor(Date.now() / 3600000);
const key = `rate:${userId}:${hour}`;
const count = await redis.incr(key);
if (count === 1) {
  await redis.expire(key, 3600);
}
```

### Sliding Window (Better)

```typescript
// Good: Prevents bursts
const now = Date.now();
const windowStart = now - 3600000; // 1 hour ago

// Remove old entries
await redis.zremrangebyscore(key, 0, windowStart);

// Count current
const count = await redis.zcard(key);

// Check limit
if (count >= limit) {
  return { allowed: false };
}

// Add current request
await redis.zadd(key, now, `${now}-${Math.random()}`);
await redis.expire(key, 3600);
```

## Performance Considerations

### Redis Operations (Sliding Window)

**For each request:**

1. `ZREMRANGEBYSCORE` - Remove expired (O(log N) + M)
2. `ZCARD` - Count current (O(1))
3. `ZADD` - Add new request (O(log N))
4. `EXPIRE` - Set expiry (O(1))

**Total:** ~O(log N) - Very fast!

### Memory Usage

```
Each request stored: ~50 bytes
1000 requests/hour = ~50 KB
Very efficient!
```

## Best Practices

### 1. **Use Appropriate Time Windows**

```typescript
// Email OTP: 5 per hour
rateLimiter.check(email, 'email', 5, 3600);

// Login attempts: 5 per 15 minutes
rateLimiter.check(ip, 'ip', 5, 900);

// API calls: 100 per minute
rateLimiter.check(apiKey, 'api', 100, 60);
```

### 2. **Different Limits for Different Actions**

```typescript
// OTP requests: Strict (5/hour)
otpRateLimit: 5 requests/hour

// OTP verification: Moderate (10/hour)
verifyRateLimit: 10 attempts/hour

// Login: Strict (3/hour)
loginRateLimit: 3 attempts/hour
```

### 3. **Return Useful Information**

```typescript
{
  allowed: false,
  remaining: 0,
  resetTime: 1633025000000, // When can they try again?
  retryAfter: 1800 // Seconds until reset
}
```

### 4. **Handle Edge Cases**

```typescript
// Redis failure → Allow request (fail open)
// Don't block users if Redis is down

try {
  const result = await rateLimiter.check(...);
  return result;
} catch (error) {
  console.error('Rate limit error:', error);
  return { allowed: true }; // Fail open
}
```

## Summary

**Sliding Window = Fair, Accurate Rate Limiting**

**Key Points:**

1. ✅ Always looks at last N time period
2. ✅ Prevents burst attacks
3. ✅ Fair distribution
4. ✅ Uses Redis Sorted Sets efficiently
5. ✅ O(log N) performance

**When to use:**

- ✅ API rate limiting
- ✅ OTP request limiting
- ✅ Login attempt limiting
- ✅ Any time you need fair rate limiting

**When NOT to use:**

- ❌ Very high traffic (millions/sec) - Use token bucket instead
- ❌ Simple use cases where fixed window is sufficient
