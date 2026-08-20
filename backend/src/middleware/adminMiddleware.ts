import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { formatErrorResponse } from '../utils/errors';

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json(formatErrorResponse('FORBIDDEN', 'Forbidden: Admins only'));
    return;
  }

  next();
};
