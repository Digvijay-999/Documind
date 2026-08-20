import { Request, Response } from 'express';
import { authRateLimit, aiRateLimit, generalRateLimit } from '../src/middleware/rateLimiter';
import { redisClient } from '../src/config/redis';
import { getPublicStats } from '../src/controllers/public.controller';
import { getDocuments, deleteDocument } from '../src/controllers/document.controller';
import prisma from '../src/utils/prisma';
import { chatSchema, agentSchema } from '../src/utils/validation';
import { MAX_AGENT_STEPS } from '../src/agents/document.agent';
import { executeSearchDocument } from '../src/tools/searchDocument';

// Mock Redis client
jest.mock('../src/config/redis', () => ({
  redisClient: {
    incr: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    isOpen: true,
  },
}));

// Mock Prisma
jest.mock('../src/utils/prisma', () => ({
  user: { count: jest.fn() },
  document: {
    count: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  aIUsage: {
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((callback) => callback(prisma)),
}));

// Mock VectorService
jest.mock('../src/services/vector.service', () => {
  return {
    VectorService: jest.fn().mockImplementation(() => ({
      deleteDocument: jest.fn().mockResolvedValue(true),
    })),
  };
});

describe('Phase 10B: Rate Limiting, Redis Caching & AI Abuse Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (redisClient as any).isOpen = true;
  });

  describe('1. Rate Limiting Middleware', () => {
    it('authRateLimit: allows requests under 10 and blocks 11th with 429 and Retry-After header', async () => {
      const req: Partial<Request> = { ip: '192.168.1.100', headers: {} };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      // Under limit (1st request)
      (redisClient.incr as jest.Mock).mockResolvedValueOnce(1);
      (redisClient.expire as jest.Mock).mockResolvedValueOnce(true);

      await authRateLimit(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect(redisClient.expire).toHaveBeenCalledWith('ratelimit:auth:192.168.1.100', 900);

      // Over limit (11th request)
      const nextOver = jest.fn();
      (redisClient.incr as jest.Mock).mockResolvedValueOnce(11);
      (redisClient.ttl as jest.Mock).mockResolvedValueOnce(450);

      await authRateLimit(req as any, res as any, nextOver);
      expect(nextOver).not.toHaveBeenCalled();
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

    it('aiRateLimit: uses authenticated user ID for rate limiting', async () => {
      const req = { user: { id: 'user-vip-123' }, headers: {} };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      };
      const next = jest.fn();

      (redisClient.incr as jest.Mock).mockResolvedValueOnce(5);

      await aiRateLimit(req as any, res as any, next);
      expect(redisClient.incr).toHaveBeenCalledWith('ratelimit:ai:user-vip-123');
      expect(next).toHaveBeenCalled();
    });

    it('rateLimit: fails open gracefully when Redis is disconnected', async () => {
      (redisClient as any).isOpen = false;
      const req: Partial<Request> = { ip: '192.168.1.50', headers: {} };
      const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      await generalRateLimit(req as any, res as any, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('2. Redis Cache-Aside & Invalidation', () => {
    it('getPublicStats: queries DB on cache miss and stores in Redis (60s TTL)', async () => {
      (redisClient.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.count as jest.Mock).mockResolvedValueOnce(15);
      (prisma.document.count as jest.Mock).mockResolvedValueOnce(42);
      (prisma.aIUsage.count as jest.Mock).mockResolvedValueOnce(128);

      const req: Partial<Request> = {};
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPublicStats(req as any, res as any);

      expect(redisClient.get).toHaveBeenCalledWith('stats:public');
      expect(prisma.user.count).toHaveBeenCalled();
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'stats:public',
        60,
        expect.stringContaining('"totalUsers":15')
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          cached: false,
          data: expect.objectContaining({ totalUsers: 15, totalDocuments: 42 }),
        })
      );
    });

    it('getPublicStats: returns cached data on cache hit without querying DB', async () => {
      const cachedPayload = JSON.stringify({
        totalUsers: 99,
        totalDocuments: 200,
        totalAIUsages: 500,
        timestamp: '2026-08-20T12:00:00.000Z',
      });
      (redisClient.get as jest.Mock).mockResolvedValueOnce(cachedPayload);

      const req: Partial<Request> = {};
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getPublicStats(req as any, res as any);

      expect(redisClient.get).toHaveBeenCalledWith('stats:public');
      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        cached: true,
        data: expect.objectContaining({ totalUsers: 99 }),
      });
    });

    it('getDocuments: caches document list scoped to user ID (30s TTL)', async () => {
      const mockDocs = [{ id: 'doc-1', name: 'Paper.pdf', status: 'READY' }];
      (redisClient.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.document.findMany as jest.Mock).mockResolvedValueOnce(mockDocs);

      const req = { user: { id: 'user-456' } };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await getDocuments(req as any, res as any);

      expect(redisClient.get).toHaveBeenCalledWith('documents:user:user-456');
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'documents:user:user-456',
        30,
        JSON.stringify(mockDocs)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, cached: false, data: mockDocs })
      );
    });

    it('deleteDocument: invalidates the user documents cache key', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'doc-999',
        userId: 'user-456',
        filePath: 'uploads/dummy.pdf',
      });

      const req = { user: { id: 'user-456' }, params: { id: 'doc-999' } };
      const res: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await deleteDocument(req as any, res as any);

      expect(redisClient.del).toHaveBeenCalledWith('documents:user:user-456');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('3. AI Abuse Protection & Agent Boundary', () => {
    it('rejects chat questions exceeding 4000 characters', () => {
      const longQuestion = 'a'.repeat(4001);
      const result = chatSchema.safeParse({
        documentId: 'doc-123',
        question: longQuestion,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('4000');
      }
    });

    it('rejects agent messages exceeding 4000 characters', () => {
      const longMessage = 'b'.repeat(4005);
      const result = agentSchema.safeParse({
        documentId: 'doc-123',
        message: longMessage,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('4000');
      }
    });

    it('enforces MAX_AGENT_STEPS = 5 as a hard boundary', () => {
      expect(MAX_AGENT_STEPS).toBe(5);
    });

    it('searchDocument tool rejects unauthorized document access', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'doc-foreign',
        userId: 'other-user',
      });

      await expect(
        executeSearchDocument('user-attacker', 'doc-foreign', { query: 'test query' })
      ).rejects.toThrow('Unauthorized or Document not found');
    });
  });
});
