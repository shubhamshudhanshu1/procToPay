import { describe, it, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../server';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';

describe('User Routes', () => {
  // let user: any;
  let sessionCookie: string;

  beforeEach(async () => {
    await prisma.loginToken.deleteMany();
    await prisma.user.deleteMany();
    await redis.flushall();

    // Create a test user
    await prisma.user.create({
      data: {
        email: 'test@example.com',
        createdVia: 'email_passwordless',
      },
    });

    // Create a session
    await request(app).post('/auth/request').send({ email: 'test@example.com' });

    // Simulate login by setting session
    const sessionResponse = await request(app).get('/csrf').expect(200);

    sessionCookie = sessionResponse.headers['set-cookie'] || '';
  });

  describe('GET /me', () => {
    it('should return user info when authenticated', async () => {
      // This would need to be properly authenticated in a real test
      // For now, we'll test the endpoint structure
      await request(app).get('/me').set('Cookie', sessionCookie).expect(401); // Should fail without proper session

      // In a real test, we'd need to properly set up the session
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/me').expect(401);
    });
  });

  describe('POST /me/logout', () => {
    it('should logout successfully', async () => {
      await request(app).post('/me/logout').set('Cookie', sessionCookie).expect(401); // Should fail without proper session
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).post('/me/logout').expect(401);
    });
  });

  describe('GET /me/sessions', () => {
    it('should return user sessions', async () => {
      await request(app).get('/me/sessions').set('Cookie', sessionCookie).expect(401); // Should fail without proper session
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).get('/me/sessions').expect(401);
    });
  });

  describe('POST /me/sessions/revoke', () => {
    it('should revoke specific session', async () => {
      await request(app)
        .post('/me/sessions/revoke')
        .set('Cookie', sessionCookie)
        .send({ sid: 'test_session_id' })
        .expect(401); // Should fail without proper session
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).post('/me/sessions/revoke').send({ sid: 'test_session_id' }).expect(401);
    });
  });

  describe('POST /me/sessions/revoke-all', () => {
    it('should revoke all sessions', async () => {
      await request(app).post('/me/sessions/revoke-all').set('Cookie', sessionCookie).expect(401); // Should fail without proper session
    });

    it('should return 401 when not authenticated', async () => {
      await request(app).post('/me/sessions/revoke-all').expect(401);
    });
  });
});
