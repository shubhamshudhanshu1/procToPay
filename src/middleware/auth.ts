import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  session: any;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function optionalAuth(_req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  // This middleware doesn't block requests, just adds user info if available
  next();
}
