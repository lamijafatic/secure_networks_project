import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/user.types';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

export const generateToken = (userId: number, type: 'partial' | 'authenticated'): string => {
  const expiresIn = type === 'partial' ? '15m' : '24h';
  return jwt.sign({ userId, type }, JWT_SECRET, { expiresIn } as any);
};

const extractToken = (req: Request): string | null => {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.type !== 'authenticated') {
      res.status(401).json({ success: false, message: '2FA verification required' });
      return;
    }
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

export const requirePartialAuth = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, message: 'Partial authentication token required' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.type !== 'partial') {
      res.status(401).json({ success: false, message: 'Invalid token type' });
      return;
    }
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
