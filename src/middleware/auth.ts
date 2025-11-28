import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService';

export interface AuthenticatedRequest extends Request {
  session?: any;
  // Extended auth context for multi-tenant RBAC
  userId?: string;
  tenantId?: string;
  permissions?: string[];
  roles?: string[];
  policyVer?: number;
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Require authentication (supports both session and JWT tokens)
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Try JWT token first
  const token = extractToken(req);
  if (token) {
    const payload = tokenService.verifyAccessToken(token);
    if (payload) {
      // Set auth context from token
      req.userId = payload.userId;
      req.tenantId = payload.tenantId;
      req.policyVer = payload.policyVer;
      // Permissions and roles will be loaded by permission middleware if needed
      next();
      return;
    }
  }

  // Fall back to session-based auth
  if (req.session?.userId) {
    req.userId = req.session.userId;
    // Session doesn't have tenantId yet (will be set after tenant selection)
    next();
    return;
  }

  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Optional authentication (doesn't block if not authenticated)
 */
export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // Try JWT token first
  const token = extractToken(req);
  if (token) {
    const payload = tokenService.verifyAccessToken(token);
    if (payload) {
      req.userId = payload.userId;
      req.tenantId = payload.tenantId;
      req.policyVer = payload.policyVer;
    }
  } else if (req.session?.userId) {
    req.userId = req.session.userId;
  }

  next();
}
