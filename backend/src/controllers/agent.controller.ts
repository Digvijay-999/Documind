import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { DocumentAgent } from '../agents/document.agent';

const agentSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  message: z.string().min(1, 'Message is required')
});

export const runAgent = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { documentId, message } = agentSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json({ success: false, message: 'Document is not fully processed yet' });
      return;
    }

    const agent = new DocumentAgent();
    const result = await agent.run(userId, documentId, message);

    res.status(200).json({
      success: true,
      ...result
    });

  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ success: false, message: error.errors?.[0]?.message || 'Validation failed' });
    } else {
      console.error('Agent execution error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during agent execution' });
    }
  }
};
