import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router: Router = Router();

// Validation schemas
const revokeSessionSchema = z.object({
  sid: z.string().min(1),
});

// GET /me
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /logout
router.post('/logout', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessionId = req.sessionID;
    const userId = req.session.userId;

    if (sessionId && userId) {
      // Remove session from Redis
      await redis.del(`sess:${sessionId}`);

      // Remove session from user's session index
      await redis.srem(`user_session_index:${userId}`, sessionId);
    }

    // Clear session cookie
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /me/sessions
router.get('/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get all session IDs for this user
    const sessionIds = await redis.smembers(`user_session_index:${userId}`);

    if (sessionIds.length === 0) {
      res.json([]);
      return;
    }

    // Get session data for each session ID
    const sessions = await Promise.all(
      sessionIds.map(async (sid) => {
        try {
          const sessionData = await redis.get(`sess:${sid}`);
          const ttl = await redis.ttl(`sess:${sid}`);

          if (!sessionData) {
            // Session doesn't exist, remove from index
            await redis.srem(`user_session_index:${userId}`, sid);
            return null;
          }

          const parsed = JSON.parse(sessionData);
          return {
            sid,
            createdAt: new Date(
              parsed.cookie?.originalMaxAge ? Date.now() - parsed.cookie.originalMaxAge : Date.now()
            ),
            lastSeen: new Date(parsed.lastSeen || Date.now()),
            ipHash: parsed.ipHash,
            ua: parsed.ua,
            ttlSeconds: ttl > 0 ? ttl : 0,
            current: sid === req.sessionID,
          };
        } catch (error) {
          console.error('Error processing session:', error);
          return null;
        }
      })
    );

    // Filter out null sessions and sort by last seen
    const validSessions = sessions
      .filter((session): session is NonNullable<typeof session> => session !== null)
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());

    res.json(validSessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /me/sessions/revoke
router.post('/sessions/revoke', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sid } = revokeSessionSchema.parse(req.body);
    const userId = req.session.userId;

    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Verify that the session belongs to the current user
    const isUserSession = await redis.sismember(`user_session_index:${userId}`, sid);

    if (!isUserSession) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    // Don't allow revoking the current session
    if (sid === req.sessionID) {
      res.status(400).json({ error: 'Cannot revoke current session' });
      return;
    }

    // Remove session from Redis
    await redis.del(`sess:${sid}`);

    // Remove session from user's session index
    await redis.srem(`user_session_index:${userId}`, sid);

    res.status(204).send();
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /me/sessions/revoke-all
router.post(
  '/sessions/revoke-all',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get all session IDs for this user
      const sessionIds = await redis.smembers(`user_session_index:${userId}`);

      if (sessionIds.length === 0) {
        res.status(204).send();
        return;
      }

      // Remove all sessions except the current one
      const sessionsToRemove = sessionIds.filter((sid) => sid !== req.sessionID);

      if (sessionsToRemove.length > 0) {
        // Delete all sessions
        const pipeline = redis.pipeline();
        sessionsToRemove.forEach((sid) => {
          pipeline.del(`sess:${sid}`);
        });
        await pipeline.exec();
      }

      // Clear the session index
      await redis.del(`user_session_index:${userId}`);

      // Re-add current session to index
      const currentSessionId = req.sessionID;
      if (currentSessionId) {
        await redis.sadd(`user_session_index:${userId}`, currentSessionId);
      }

      res.status(204).send();
    } catch (error) {
      console.error('Revoke all sessions error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
