import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev-secret';

export interface AuthContext {
  userId: string;
  role: string;
  ethAddr?: string | null;
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function issueToken(payload: AuthContext) {
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'Missing auth header' });
  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, secret) as AuthContext;
    req.auth = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
