import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { redisClient } from '../config/redis';
import { formatErrorResponse } from '../utils/errors';

interface RateLimitOptions {
  keyPrefix: string;
  limit: number;
  windowSeconds: number;
  errorMessage: string;
  getIdentifier: (req: Request | AuthRequest) => string;
}

const createRateLimiter = (options: RateLimitOptions) => {
  return async (req: Request | AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // If Redis is offline or not connected, degrade gracefully to allow request
    if (!redisClient.isOpen) {
      next();
      return;
    }

    try {
      const identifier = options.getIdentifier(req);
      if (!identifier) {
        next();
        return;
      }

      const key = `ratelimit:${options.keyPrefix}:${identifier}`;
      const currentCount = await redisClient.incr(key);

      if (currentCount === 1) {
        await redisClient.expire(key, options.windowSeconds);
      }

      if (currentCount > options.limit) {
        let ttl = await redisClient.ttl(key);
        if (ttl <= 0) ttl = options.windowSeconds;

        if (typeof res.setHeader === 'function') {
          res.setHeader('Retry-After', String(ttl));
          res.setHeader('X-RateLimit-Limit', String(options.limit));
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() / 1000) + ttl));
        }

        res.status(429).json(
          formatErrorResponse('RATE_LIMITED', options.errorMessage, [
            {
              message: `Rate limit exceeded. Try again in ${ttl} seconds.`,
              retryAfter: ttl,
            },
          ])
        );
        return;
      }

      if (typeof res.setHeader === 'function') {
        const remaining = Math.max(0, options.limit - currentCount);
        res.setHeader('X-RateLimit-Limit', String(options.limit));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
      }

      next();
    } catch (error) {
      console.error(`[RateLimiter:${options.keyPrefix}] Error:`, error);
      // Graceful degradation on error
      next();
    }
  };
};

const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
};

// 1. Auth Rate Limiter: 10 requests / 15 minutes per IP
export const authRateLimit = createRateLimiter({
  keyPrefix: 'auth',
  limit: parseInt(process.env.AUTH_RATE_LIMIT || '10', 10),
  windowSeconds: parseInt(process.env.AUTH_RATE_WINDOW_SECONDS || '900', 10), // 15 mins
  errorMessage: 'Too many authentication attempts. Please try again later.',
  getIdentifier: (req) => getClientIp(req),
});

// 2. AI Rate Limiter: 20 requests / 15 minutes per Authenticated User ID
export const aiRateLimit = createRateLimiter({
  keyPrefix: 'ai',
  limit: parseInt(process.env.AI_RATE_LIMIT || '20', 10),
  windowSeconds: parseInt(process.env.AI_RATE_WINDOW_SECONDS || '900', 10), // 15 mins
  errorMessage: 'AI request rate limit exceeded. Please try again later.',
  getIdentifier: (req: AuthRequest) => {
    return req.user?.id || getClientIp(req);
  },
});

// 3. General API Rate Limiter: 100 requests / 15 minutes per IP
export const generalRateLimit = createRateLimiter({
  keyPrefix: 'general',
  limit: parseInt(process.env.GENERAL_RATE_LIMIT || '100', 10),
  windowSeconds: parseInt(process.env.GENERAL_RATE_WINDOW_SECONDS || '900', 10), // 15 mins
  errorMessage: 'API request limit exceeded. Please try again later.',
  getIdentifier: (req) => getClientIp(req),
});
