import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { logger } from '../lib/logger';

/**
 * Request validation middleware factory
 * Validates request body against a Zod schema
 */
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        logger.warn('Validation failed', { errors: result.error.flatten() });
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: result.error.flatten()
          }
        });
      }
      req.validatedBody = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware to log API requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  const onFinish = () => {
    const duration = Date.now() - start;
    const { method, path, url } = req;
    const { statusCode } = res;
    const userId = (req as any).auth?.userId;

    if (statusCode >= 500) {
      logger.error(`${method} ${path}`, new Error(url), {
        statusCode,
        duration,
        userId
      });
    } else if (statusCode >= 400) {
      logger.warn(`${method} ${path}`, { statusCode, duration, userId });
    } else {
      logger.info(`${method} ${path}`, { statusCode, duration, userId });
    }
  };

  res.once('finish', onFinish);
  res.once('close', onFinish);
  
  next();
}

/**
 * Require specific role middleware
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).auth?.role;
    if (!userRole || !roles.includes(userRole)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of: ${roles.join(', ')}`
        }
      });
    }
    next();
  };
}

/**
 * Require specific permissions
 */
export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        });
      }

      // Implement permission check based on your system
      // This is a placeholder - customize based on your needs
      const hasPermission = checkUserPermission(userId, permission);
      
      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'PERMISSION_DENIED',
            message: `Permission denied: ${permission}`
          }
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Catch 404 and forward to error handler
 */
export function notFound(req: Request, res: Response, _next: NextFunction) {
  const err = new AppError(404, `Not Found - ${req.originalUrl}`, 'NOT_FOUND');
  res.status(404).json({
    error: {
      code: err.code,
      message: err.message,
      statusCode: 404
    }
  });
}

/**
 * Helper to check permissions (implement based on your system)
 */
function checkUserPermission(userId: string, permission: string): boolean {
  // Implement your permission checking logic here
  // This could involve checking a database, cache, or configuration
  return true; // Default to allow
}

declare module 'express-serve-static-core' {
  interface Request {
    validatedBody?: any;
  }
}
