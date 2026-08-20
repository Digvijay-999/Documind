import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { formatErrorResponse } from '../utils/errors';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized: Missing or invalid token format'));
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

  try {
    const decoded = jwt.verify(token, secret) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized: Invalid or expired token'));
    return;
  }
};
