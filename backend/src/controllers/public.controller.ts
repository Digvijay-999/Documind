import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export const getPublicStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await prisma.user.count();
    const totalDocuments = await prisma.document.count();
    const totalAIUsages = await prisma.aIUsage.count();

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalDocuments,
        totalAIUsages,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to fetch public stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
