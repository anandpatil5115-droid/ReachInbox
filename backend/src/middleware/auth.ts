import { Request, Response, NextFunction } from 'express';
import db from '../config/database';

export interface AuthUser {
  id: string;
  providerId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface User extends AuthUser {}
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

export function attachUser(req: Request, res: Response, next: NextFunction): void {
  if (req.isAuthenticated() && req.user) {
    next();
  } else {
    next();
  }
}
