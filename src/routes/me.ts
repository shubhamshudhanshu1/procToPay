import { Router, Response } from 'express';
import { z, ZodError } from 'zod';
import { prisma } from '../db/prisma';
import { redis } from '../lib/redis';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { userRoleService } from '../services/userRoleService';
import { permissionCheckService } from '../services/permissionCheckService';
import { tenantService } from '../services/tenantService';
import { policyService } from '../services/policyService';

const router: Router = Router();

// Validation schemas
const revokeSessionSchema = z.object({
  sid: z.string().min(1),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  email: z.string().email().optional(),
});

// GET /me
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.userId || req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Get tenantId from token or session
    const tenantId = req.tenantId || req.session?.tenantId;

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Get current tenant if tenantId is set
    let currentTenant = null;
    if (tenantId) {
      currentTenant = await tenantService.getTenantById(tenantId);
    }

    // Get user's roles
    // Always include global roles (tenantId = null)
    // If tenantId is set, also include tenant-specific roles
    const globalRoles = await userRoleService.getUserRoles(userId, null);
    let tenantRoles: typeof globalRoles = [];

    if (tenantId) {
      tenantRoles = await userRoleService.getUserRoles(userId, tenantId);
    }

    // Combine global and tenant roles, removing duplicates by role ID
    const allUserRoles = [...globalRoles, ...tenantRoles];
    const uniqueRolesMap = new Map();
    allUserRoles.forEach((ur) => {
      if (!uniqueRolesMap.has(ur.role.id)) {
        uniqueRolesMap.set(ur.role.id, ur);
      }
    });

    const roles = Array.from(uniqueRolesMap.values()).map((ur) => ({
      id: ur.role.id,
      slug: ur.role.slug,
      name: ur.role.name,
      tenantId: ur.role.tenantId,
    }));

    // Get user's effective permissions
    const effectivePermissions = await permissionCheckService.getUserEffectivePermissions(
      userId,
      tenantId || null
    );

    // Extract permission slugs
    const permissions = effectivePermissions.map((p) => p.permission_slug);

    // Get policy version
    const policyVer = await policyService.getPolicyVersion();

    res.json({
      id: user.id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      currentTenant: currentTenant
        ? {
            id: currentTenant.id,
            name: currentTenant.name,
            code: currentTenant.code,
            status: currentTenant.status,
          }
        : null,
      roles,
      permissions,
      policyVer,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /me - Update user profile
router.put('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const data = updateProfileSchema.parse(req.body);

    // Check if email is already taken by another user
    if (data.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: data.email,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email && { email: data.email }),
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Update profile error:', error);
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
