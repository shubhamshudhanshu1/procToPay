import Redis from 'ioredis';
import { env } from '../config/env';

declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

export const redis = globalThis.__redis || new Redis(env.REDIS_URL);

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__redis = redis;
}

export default redis;
