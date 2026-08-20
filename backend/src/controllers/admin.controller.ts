import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
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
