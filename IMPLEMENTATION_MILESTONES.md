# Authentication System Implementation - Milestones

## Overview

This document tracks the step-by-step implementation of the authentication system, broken down into 9 milestones.

---

## 📦 Milestone 1: Database Schema Setup

**Goal**: Set up Prisma schema with all required models

**Tasks**:

1. Create Prisma schema with User, OTPToken, Configuration, Session models
2. Add database indexes for performance
3. Create migration files
4. Set up Prisma client configuration

**Deliverables**:

- `prisma/schema.prisma` file
- Database migrations
- Prisma client ready to use

**Review Point**: After schema is created and migrations run

---

## ⚙️ Milestone 2: Global Configuration System

**Goal**: Implement database-driven configuration with Redis caching

**Tasks**:

1. Create ConfigService class with Redis caching
2. Implement configuration get/set methods
3. Create seed script to populate default configurations
4. Add helper methods: getOTPConfig(), getRateLimitConfig()

**Deliverables**:

- `src/services/configService.ts`
- Configuration seed script
- All default configs in database

**Review Point**: After config system is working and tested

---

## 📧 Milestone 3: Contact Normalization Service

**Goal**: Implement email and phone normalization/validation

**Tasks**:

1. Create ContactService class
2. Implement email normalization (lowercase, trim)
3. Implement email validation (RFC 5322)
4. Implement phone normalization (E.164 format)
5. Implement phone validation (10-15 digits)
6. Add detectContactType() method

**Deliverables**:

- `src/services/contactService.ts`
- Email/phone normalization working
- Validation tests passing

**Review Point**: After normalization service is complete

---

## 🔐 Milestone 4: OTP Service

**Goal**: Implement complete OTP generation, storage, and verification

**Tasks**:

1. Create OTPService class
2. Implement OTP generation (cryptographically secure, configurable length)
3. Implement hardcoded OTP logic (last 4 digits of phone)
4. Implement OTP hashing (HMAC-SHA256)
5. Implement OTP storage (Redis + Database)
6. Implement OTP verification with attempt tracking
7. Implement OTP invalidation/cleanup

**Deliverables**:

- `src/services/otpService.ts`
- OTP generation working
- OTP verification working
- Hardcoded OTP for testing working

**Review Point**: After OTP service is complete and tested

---

## 🚦 Milestone 5: Rate Limiting Service

**Goal**: Implement sliding window rate limiting

**Tasks**:

1. Create RateLimiterService class
2. Implement sliding window algorithm with Redis sorted sets
3. Add rate limit checks for OTP requests (per contact)
4. Add rate limit checks for IP addresses
5. Add resend timer check (60 seconds)
6. Integrate with configuration system

**Deliverables**:

- `src/services/rateLimiterService.ts`
- Rate limiting working
- Sliding window algorithm implemented
- Configurable limits

**Review Point**: After rate limiting is working

---

## 📨 Milestone 6: Email & SMS Services

**Goal**: Set up email and SMS delivery

**Tasks**:

1. Create EmailService class
2. Set up SendGrid integration (or chosen provider)
3. Implement sendOTP() method with email template
4. Create SMSService class
5. Set up Twilio integration (or chosen provider)
6. Implement sendOTP() method for SMS

**Deliverables**:

- `src/services/emailService.ts`
- `src/services/smsService.ts`
- Email sending working
- SMS sending working (optional for MVP)

**Review Point**: After email/SMS services are set up

---

## 🔑 Milestone 7: Authentication Service

**Goal**: Implement complete authentication flows

**Tasks**:

1. Create AuthService class
2. Implement requestOTP() - login flow
3. Implement verifyOTP() - login verification
4. Implement register() - registration flow
5. Implement sequential verification (email then phone)
6. Add user creation/update logic
7. Implement session creation after verification

**Deliverables**:

- `src/services/authService.ts`
- Login flow working
- Registration flow working
- Session management working

**Review Point**: After auth service is complete

---

## 🌐 Milestone 8: Express Routes & Controllers

**Goal**: Create API endpoints and wire everything together

**Tasks**:

1. Create Zod validation schemas for all endpoints
2. Implement POST /api/auth/login/request endpoint
3. Implement POST /api/auth/login/verify endpoint
4. Implement POST /api/auth/register endpoint
5. Implement POST /api/auth/register/verify endpoint
6. Add session middleware
7. Add error handling middleware
8. Implement POST /api/auth/logout endpoint

**Deliverables**:

- `src/routes/authRoutes.ts`
- `src/controllers/authController.ts`
- `src/middleware/validation.ts`
- All API endpoints working

**Review Point**: After routes are complete and tested

---

## ✅ Milestone 9: Testing & Validation

**Goal**: Comprehensive testing

**Tasks**:

1. Write unit tests for ContactService
2. Write unit tests for OTPService
3. Write unit tests for RateLimiterService
4. Write integration tests for auth flows
5. Test hardcoded OTP with phone numbers
6. Test rate limiting edge cases

**Deliverables**:

- Test files for all services
- Integration tests
- All tests passing

**Review Point**: Final review before production

---

## Implementation Order

```
Milestone 1 → Database Schema
    ↓
Milestone 2 → Configuration System
    ↓
Milestone 3 → Contact Normalization
    ↓
Milestone 4 → OTP Service
    ↓
Milestone 5 → Rate Limiting
    ↓
Milestone 6 → Email/SMS Services
    ↓
Milestone 7 → Authentication Service
    ↓
Milestone 8 → Express Routes
    ↓
Milestone 9 → Testing
```

---

## Current Status

**Completed Milestones**: 
- ✅ Milestone 1: Database Schema Setup
- ✅ Milestone 2: Global Configuration System

**Next Milestone**: 📧 Milestone 3: Contact Normalization Service

**Ready to Start**: ✅ Yes

**Note**: After Milestone 2, regenerate Prisma client (`npm run db:generate`) and run seed (`npm run db:seed`)

---

**Last Updated**: [Current Date]
