import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  
  // Session
  SESSION_SECRET: z.string().min(32),
  
  // Application URLs
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  
  // Email Configuration
  MAIL_FROM: z.string().email(),
  SENDGRID_API_KEY: z.string().optional(),
  
  // SMS Configuration (Twilio)
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  
  // Authentication Configuration
  AUTH_MODE: z.enum(['otp', 'magic']).default('otp'),
  OTP_LENGTH: z.coerce.number().min(4).max(8).default(6),
  OTP_TTL_SECONDS: z.coerce.number().min(60).max(3600).default(600),
  
  // Development
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;
