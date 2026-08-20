import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { redisClient } from '../config/redis';
import { formatErrorResponse } from '../utils/errors';

export const getPublicStats = async (req: Request, res: Response): Promise<void> => {
  const CACHE_KEY = 'stats:public';
  const CACHE_TTL_SECONDS = 60;

  try {
    // 1. Check Redis Cache
    if (redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(CACHE_KEY);
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          res.status(200).json({
            success: true,
            data: parsed,
            cached: true,
          });
          return;
        }
      } catch (cacheErr) {
        console.warn('[Cache:getPublicStats] Redis read failed, falling back to DB:', cacheErr);
      }
    }

    // 2. Query PostgreSQL
    const totalUsers = await prisma.user.count();
    const totalDocuments = await prisma.document.count();
    const totalAIUsages = await prisma.aIUsage.count();

    const statsData = {
      totalUsers,
      totalDocuments,
      totalAIUsages,
      timestamp: new Date().toISOString(),
    };

    // 3. Populate Redis Cache
    if (redisClient.isOpen) {
      try {
        await redisClient.setEx(CACHE_KEY, CACHE_TTL_SECONDS, JSON.stringify(statsData));
      } catch (cacheErr) {
        console.warn('[Cache:getPublicStats] Redis write failed:', cacheErr);
      }
    }

    res.status(200).json({
      success: true,
      data: statsData,
      cached: false,
    });
  } catch (error: any) {
    console.error('Failed to fetch public stats:', error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Failed to fetch public statistics'));
  }
};
