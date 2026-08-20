import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { redisClient } from '../config/redis';
import { formatErrorResponse } from '../utils/errors';

export const aiRateLimit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  // If Redis is not connected, bypass rate limit to avoid breaking the app
  if (!redisClient.isOpen) {
    next();
    return;
  }

  const limit = parseInt(process.env.AI_RATE_LIMIT || '30', 10);
  const windowSeconds = parseInt(process.env.AI_RATE_WINDOW_SECONDS || '3600', 10);
  const key = `ratelimit:ai:${userId}`;

  try {
    const currentCount = await redisClient.incr(key);

    if (currentCount === 1) {
      // Set expiry on the first request
      await redisClient.expire(key, windowSeconds);
    }

    if (currentCount > limit) {
      res.status(429).json(formatErrorResponse('RATE_LIMITED', 'AI request rate limit exceeded. Please try again later.'));
      return;
    }

    next();
  } catch (error) {
    console.error('Rate Limiter Error:', error);
    // On Redis failure, degrade gracefully and allow the request
    next();
  }
};
