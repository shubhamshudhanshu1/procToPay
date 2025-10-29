# Production-Ready Passwordless Authentication System

A secure, production-ready passwordless authentication system built with Node.js, TypeScript, Express, PostgreSQL, and Redis. Supports both OTP (One-Time Password) and Magic Link authentication methods.

## Features

- **Passwordless Authentication**: Email-based login with no passwords required
- **Dual Authentication Modes**: OTP codes or Magic Links (configurable)
- **Stateful Sessions**: Redis-backed sessions with device management
- **Security Features**:
  - CSRF protection
  - Rate limiting (per email and IP)
  - Session fixation defense
  - Secure token handling
  - Email normalization
- **Device Management**: List, revoke individual or all sessions
- **Email Support**: SendGrid integration with SMTP fallback
- **Production Ready**: Docker support, health checks, comprehensive testing

## Tech Stack

- **Backend**: Node.js 20+, TypeScript, Express
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Sessions**: Redis with ioredis
- **Email**: Nodemailer with SendGrid/SMTP support
- **Security**: express-session, connect-redis, csurf, helmet
- **Validation**: Zod
- **Testing**: Vitest + Supertest
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- pnpm (recommended) or npm

### 1. Clone and Install

```bash
git clone <repository-url>
cd procToPay
pnpm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/proctopay?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Session
SESSION_SECRET="your-32-byte-secret-key-here-change-in-production"

# Application URLs
APP_URL="https://app.localhost:3000"
API_URL="https://api.localhost:4000"

# Email Configuration
MAIL_FROM="Example <noreply@example.com>"
SENDGRID_API_KEY="your-sendgrid-api-key-here" # Optional

# Authentication Configuration
AUTH_MODE="otp" # 'otp' or 'magic'
OTP_LENGTH=6
OTP_TTL_SECONDS=600

# Development
NODE_ENV="development"
PORT=4000
```

### 3. Start Services

```bash
# Start PostgreSQL and Redis
pnpm docker:up

# Generate Prisma client and run migrations
pnpm db:generate
pnpm db:migrate

# Start the development server
pnpm dev
```

### 4. Test the API

The API will be available at `http://localhost:4000`

## API Endpoints

### Authentication

#### Request Login (OTP Mode)
```bash
curl -X POST http://localhost:4000/auth/request \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### Verify OTP
```bash
curl -X POST http://localhost:4000/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "otp": "123456"}'
```

#### Request Login (Magic Link Mode)
```bash
curl -X POST http://localhost:4000/auth/request \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### Verify Magic Link
```bash
# Browser redirect
GET http://localhost:4000/auth/verify?token=magic_token

# API endpoint
curl -X POST http://localhost:4000/auth/verify-magic \
  -H "Content-Type: application/json" \
  -d '{"token": "magic_token"}'
```

### User Management

#### Get Current User
```bash
curl -X GET http://localhost:4000/me \
  -H "Cookie: sid=your_session_id"
```

#### Logout
```bash
curl -X POST http://localhost:4000/me/logout \
  -H "Cookie: sid=your_session_id"
```

#### List Sessions
```bash
curl -X GET http://localhost:4000/me/sessions \
  -H "Cookie: sid=your_session_id"
```

#### Revoke Session
```bash
curl -X POST http://localhost:4000/me/sessions/revoke \
  -H "Cookie: sid=your_session_id" \
  -H "Content-Type: application/json" \
  -d '{"sid": "session_id_to_revoke"}'
```

#### Revoke All Sessions
```bash
curl -X POST http://localhost:4000/me/sessions/revoke-all \
  -H "Cookie: sid=your_session_id"
```

#### Get CSRF Token
```bash
curl -X GET http://localhost:4000/csrf
```

## Development

### Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm db:generate       # Generate Prisma client
pnpm db:migrate        # Run database migrations
pnpm db:deploy         # Deploy migrations (production)

# Testing
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode

# Code Quality
pnpm lint             # Run ESLint
pnpm format           # Format code with Prettier

# Docker
pnpm docker:up         # Start services
pnpm docker:down      # Stop services
pnpm docker:dev       # Start development environment
```

### Project Structure

```
src/
├── config/           # Configuration files
│   ├── env.ts        # Environment validation
│   └── session.ts     # Session configuration
├── db/               # Database
│   └── prisma.ts     # Prisma client
├── lib/              # Utilities
│   ├── crypto.ts     # Cryptographic functions
│   ├── mailer.ts     # Email service
│   ├── rateLimit.ts  # Rate limiting
│   └── redis.ts      # Redis client
├── middleware/       # Express middleware
│   ├── auth.ts       # Authentication middleware
│   ├── csrf.ts       # CSRF middleware
│   └── rateLimit.ts  # Rate limiting middleware
├── routes/           # API routes
│   ├── auth.ts       # Authentication routes
│   └── me.ts         # User routes
├── tests/            # Test files
│   ├── setup.ts      # Test setup
│   ├── auth.test.ts  # Authentication tests
│   └── me.test.ts    # User route tests
└── server.ts         # Main server file
```

## Security Features

### Authentication Security

- **No Password Storage**: No passwords are ever stored
- **Token Security**: OTPs are hashed using HMAC, magic tokens are cryptographically secure
- **Session Security**: Sessions are stored in Redis with secure cookies
- **Session Fixation Protection**: Session ID is regenerated on login
- **Rate Limiting**: Per-email and per-IP rate limits prevent abuse

### Data Protection

- **Email Normalization**: All emails are normalized (lowercase, trimmed)
- **IP/UA Hashing**: IP addresses and User-Agents are hashed for privacy
- **No User Enumeration**: All responses return 204 to prevent user enumeration
- **CSRF Protection**: CSRF tokens required for state-changing operations

### Session Management

- **Device Tracking**: Each device gets a unique session
- **Session Indexing**: User sessions are indexed for management
- **Session Revocation**: Users can revoke individual or all sessions
- **Automatic Cleanup**: Expired sessions are automatically cleaned up

## Email Configuration

### SendGrid (Production)

Set `SENDGRID_API_KEY` in your environment:

```env
SENDGRID_API_KEY="your-sendgrid-api-key"
```

### Local SMTP (Development)

For development, use MailHog (included in docker-compose):

```bash
pnpm docker:up
```

MailHog will be available at:
- SMTP: `localhost:1025`
- Web UI: `http://localhost:8025`

## Production Deployment

### Environment Variables

Ensure all required environment variables are set:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
SESSION_SECRET=your-32-byte-secret-key
APP_URL=https://your-app-domain.com
API_URL=https://your-api-domain.com
MAIL_FROM="Your App <noreply@your-domain.com>"
SENDGRID_API_KEY=your-sendgrid-api-key
AUTH_MODE=otp
OTP_LENGTH=6
OTP_TTL_SECONDS=600
```

### Docker Deployment

```bash
# Build and start
docker-compose up --build

# Or for production
docker-compose -f docker-compose.yml up -d
```

### Database Migrations

```bash
# Run migrations
pnpm db:deploy

# Or with Docker
docker-compose exec app pnpm db:deploy
```

## Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test auth.test.ts
```

### Test Coverage

The test suite covers:
- Authentication flows (OTP and Magic Link)
- Rate limiting
- Session management
- User management
- Error handling
- Security features

## Security Checklist

- [ ] Change default `SESSION_SECRET`
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Set up proper email service (SendGrid)
- [ ] Configure rate limiting for your use case
- [ ] Set up monitoring and logging
- [ ] Regular security updates
- [ ] Database backups
- [ ] Redis persistence (if needed)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information

## Changelog

### v1.0.0
- Initial release
- OTP and Magic Link authentication
- Session management
- Rate limiting
- Security features
- Docker support
- Comprehensive testing