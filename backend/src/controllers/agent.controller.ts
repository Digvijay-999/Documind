import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { DocumentAgent } from '../agents/document.agent';
import { ChatSession } from '../models/ChatSession';
import { agentSchema } from '../utils/validation';
import { formatErrorResponse } from '../utils/errors';

export const runAgent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const { documentId, message } = agentSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Document is not fully processed yet'));
      return;
    }

    const agent = new DocumentAgent();
    const result = await agent.run(userId, documentId, message);

    // Save chat history to MongoDB
    try {
      const chatSession = await ChatSession.findOneAndUpdate(
        { userId, documentId },
        { $setOnInsert: { userId, documentId } },
        { upsert: true, new: true }
      );
      chatSession.messages.push({ role: 'user', content: message, createdAt: new Date() });
      if (result.answer) {
        chatSession.messages.push({ role: 'assistant', content: result.answer, createdAt: new Date() });
      }
      await chatSession.save();
    } catch (err) {
      console.error('Failed to save agent chat to MongoDB:', err);
    }

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
    } else {
      console.error('Agent execution error:', error);
      res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error during agent execution'));
    }
  }
};
