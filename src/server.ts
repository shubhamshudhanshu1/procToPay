import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
// import csurf from 'csurf';
import { env } from './config/env';
import { sessionConfig } from './config/session';
import authRoutes from './routes/authRoutes';
import tenantRoutes from './routes/tenantRoutes';
import tenantScopedRoutes from './routes/tenants';
import adminRoutes from './routes/admin';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import meRoutes from './routes/me';
import configRoutes from './routes/configRoutes';
import { getCSRFToken } from './middleware/csrf';
import { requireAuth } from './middleware/auth';
import totTemplatesRoutes from './routes/totTemplates';

const app: express.Application = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  })
);

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session middleware
app.use(session(sessionConfig));

// CSRF protection for state-changing routes
// const csrfProtection = csurf({
//   cookie: {
//     httpOnly: true,
//     secure: env.NODE_ENV === 'production',
//     sameSite: 'lax',
//   },
// });

// Health check endpoint (no CSRF protection needed)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// CSRF token endpoint
app.get('/csrf', getCSRFToken);

// Routes
app.use('/api/config', configRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/auth', tenantRoutes); // Tenant selection endpoints
app.use('/api/admin', requireAuth, adminRoutes); // Admin endpoints (Global admin only) - requires authentication
app.use('/api/tenants', tenantScopedRoutes); // Tenant-scoped endpoints
app.use('/api/tot-templates', totTemplatesRoutes); // TOT Templates endpoints (includes auth, tenant context, and permissions)
app.use('/api/me', meRoutes);

// 404 handler
app.use('*', notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
  console.log(`Auth mode: ${env.AUTH_MODE}`);
  console.log(`App URL: ${env.APP_URL}`);
});

export default app;
