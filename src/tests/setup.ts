import { beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

const prisma = new PrismaClient();
const redis = new Redis(process.env['REDIS_URL'] || 'redis://localhost:6379');

beforeAll(async () => {
  // Clean up before tests
  await prisma.loginToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushall();
});

afterAll(async () => {
  // Clean up after tests
  await prisma.loginToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushall();
  await prisma.$disconnect();
  await redis.disconnect();
});

beforeEach(async () => {
  // Clean up between tests
  await prisma.loginToken.deleteMany();
  await prisma.user.deleteMany();
  await redis.flushall();
});
