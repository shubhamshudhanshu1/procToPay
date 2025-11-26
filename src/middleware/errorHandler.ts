import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';

/**
 * Error handling middleware
 * Handles Zod validation errors, custom errors, and generic errors
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));

    res.status(400).json({
      error: 'Validation error',
      details: errors,
    });
    return;
  }

  // CSRF token errors
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  // Custom application errors (with status code)
  if (err.statusCode) {
    res.status(err.statusCode).json({
      error: err.message || 'An error occurred',
      ...(err.details && { details: err.details }),
    });
    return;
  }

  // Generic errors
  console.error('Error:', err);

  res.status(500).json({
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'An unexpected error occurred',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl,
  });
}

