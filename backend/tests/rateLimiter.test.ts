import { Request, Response } from 'express';
import { aiRateLimit } from '../src/middleware/rateLimiter';
import { redisClient } from '../src/config/redis';

jest.mock('../src/config/redis', () => ({
  redisClient: {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn().mockResolvedValue(900),
    isOpen: true,
  },
}));

describe('Rate Limiter Middleware', () => {
  let req: Partial<Request & { user?: { id: string } }>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = { user: { id: 'test-user' }, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      setHeader: jest.fn(),
    };
    next = jest.fn();
    process.env.AI_RATE_LIMIT = '30';
    process.env.AI_RATE_WINDOW_SECONDS = '900';
    jest.clearAllMocks();
  });

  it('should allow requests under the limit', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(1);
    await aiRateLimit(req as any, res as any, next);

    expect(redisClient.incr).toHaveBeenCalledWith('ratelimit:ai:test-user');
    expect(redisClient.expire).toHaveBeenCalledWith('ratelimit:ai:test-user', 900);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should block requests over the limit', async () => {
    (redisClient.incr as jest.Mock).mockResolvedValue(31);
    (redisClient.ttl as jest.Mock).mockResolvedValue(450);

    await aiRateLimit(req as any, res as any, next);

    expect(redisClient.incr).toHaveBeenCalledWith('ratelimit:ai:test-user');
    expect(redisClient.expire).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '450');
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'RATE_LIMITED',
        }),
      })
    );
  });

  it('should maintain independent limits for different users', async () => {
    const req1 = { user: { id: 'user-1' }, headers: {} };
    const req2 = { user: { id: 'user-2' }, headers: {} };

    (redisClient.incr as jest.Mock).mockImplementation((key: string) => {
      if (key === 'ratelimit:ai:user-1') return Promise.resolve(31);
      if (key === 'ratelimit:ai:user-2') return Promise.resolve(10);
    });

    await aiRateLimit(req1 as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(429);

    const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
    const next2 = jest.fn();
    await aiRateLimit(req2 as any, res2 as any, next2);
    expect(next2).toHaveBeenCalled();
    expect(res2.status).not.toHaveBeenCalled();
  });

  it('should bypass limit if redis is closed', async () => {
    (redisClient as any).isOpen = false;
    await aiRateLimit(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    (redisClient as any).isOpen = true; // reset
  });
});
