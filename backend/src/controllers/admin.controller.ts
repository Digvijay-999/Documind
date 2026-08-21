import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { ChatSession } from '../models/ChatSession';
import { formatErrorResponse } from '../utils/errors';

export const getAllDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const documents = await prisma.document.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedDocuments = documents.map((doc) => ({
      documentId: doc.id,
      fileName: doc.originalFileName,
      status: doc.status,
      ownerEmail: doc.user.email,
      createdAt: doc.createdAt,
    }));

    res.status(200).json({ success: true, data: formattedDocuments });
  } catch (error) {
    console.error('Failed to fetch admin documents:', error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

/**
 * MongoDB Aggregation Pipeline Endpoint
 * Demonstrates $match, $group, and $sort stages over ChatSession collection
 * GET /api/admin/chat-stats
 */
export const getChatStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await ChatSession.aggregate([
      // Stage 1: Filter out any sessions without messages
      {
        $match: {
          'messages.0': { $exists: true },
        },
      },
      // Stage 2: Group by documentId and compute aggregates
      {
        $group: {
          _id: '$documentId',
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          lastInteraction: { $max: '$updatedAt' },
        },
      },
      // Stage 3: Sort by total messages descending
      {
        $sort: {
          totalMessages: -1,
        },
      },
    ]);

    const formatted = stats.map((item) => ({
      documentId: item._id,
      totalSessions: item.totalSessions,
      totalMessages: item.totalMessages,
      lastInteraction: item.lastInteraction,
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error('Failed to aggregate chat stats:', error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};
