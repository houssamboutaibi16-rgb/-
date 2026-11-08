import { Request, Response, NextFunction } from 'express';
import { db, User } from '../db.ts';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: يلزم تسجيل الدخول أولاً' });
  }

  const token = authHeader.substring(7).trim();
  const session = db.findSession(token);

  if (!session) {
    return res.status(401).json({ error: 'جلسة الدخول منتهية أو غير صالحة. يرجى تسجيل الدخول مرة أخرى.' });
  }

  const user = db.findUserById(session.userId);
  if (!user) {
    return res.status(401).json({ error: 'المستخدم غير موجود' });
  }

  req.user = user;
  req.token = token;
  next();
}
