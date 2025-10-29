import session from 'express-session';
import { redis } from '../lib/redis';
import { env } from './env';

// Temporarily use memory store to get server running
// TODO: Fix RedisStore import issue
// const RedisStore = require('connect-redis');
// store: new RedisStore({ client: redis }),

export const sessionConfig: session.SessionOptions = {
  // store: new RedisStore({ client: redis }),
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sid',
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  rolling: true,
};
