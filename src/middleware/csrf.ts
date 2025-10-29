import { Request, Response, NextFunction } from 'express';

export function csrfHandler(_req: Request, _res: Response, next: NextFunction): void {
  // CSRF protection is handled by the csurf middleware in server.ts
  // This is just a placeholder for any additional CSRF logic
  next();
}

export function getCSRFToken(req: Request, res: Response): void {
  // CSRF is temporarily disabled, return a placeholder token
  res.json({ csrfToken: 'csrf-disabled' });
}
