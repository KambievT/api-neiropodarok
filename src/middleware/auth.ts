import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequestUser } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: AuthRequestUser;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const token = authHeader.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthRequestUser;
    req.user = { id: payload.id, email: payload.email };
    next();
  } catch {
    return res.status(401).json({ message: 'Неверный или просроченный токен' });
  }
}

