import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { ChatSession } from '../models/ChatSession';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { formatErrorResponse } from '../utils/errors';

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const documentId = req.params.documentId as string;
    // Verify document ownership first
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    const session = await ChatSession.findOne({ userId, documentId });
    res.status(200).json({
      success: true,
      data: session?.messages || []
    });
  } catch (error: any) {
    console.error('Failed to get chat history:', error.message);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().trim().min(1, 'Content is required')
});

export const addChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { documentId } = req.params;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const { role, content } = messageSchema.parse(req.body);
    const docId = documentId as string;

    // Enforce ownership
    const document = await prisma.document.findUnique({ where: { id: docId } });
    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    const chatSession = await ChatSession.findOneAndUpdate(
      { userId, documentId: docId },
      { $setOnInsert: { userId, documentId: docId } },
      { upsert: true, new: true }
    );

    chatSession.messages.push({ role, content, createdAt: new Date() });
    await chatSession.save();

    res.status(201).json({ success: true, message: 'Message added successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
    } else {
      console.error('Failed to add chat message:', error);
      res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
    }
  }
};
