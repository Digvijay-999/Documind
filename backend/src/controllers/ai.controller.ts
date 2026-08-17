import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { RagService } from '../services/rag.service';
import { UsageService } from '../services/usage.service';

const ragService = new RagService();

const chatSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  question: z.string().min(1, 'Question is required')
});

export const chatWithDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const { documentId, question } = chatSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json({ success: false, message: 'Document is not fully processed yet' });
      return;
    }

    const result = await ragService.answerQuestion(userId, documentId, question);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ success: false, message: error.errors?.[0]?.message || 'Validation failed' });
    } else {
      console.error('Chat error:', error);
      res.status(500).json({ success: false, message: 'Internal server error during chat' });
    }
  }
};

export const streamChatWithDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    console.log('[CHAT STREAM] authenticated');
    const { documentId, question } = chatSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json({ success: false, message: 'Document not found or unauthorized' });
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json({ success: false, message: 'Document is not fully processed yet' });
      return;
    }

    console.log('[CHAT STREAM] document verified');
    const startTime = Date.now();
    const { responseStream, chunks, model } = await ragService.streamAnswer(documentId, question);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let totalTokens = 0; // Simple estimation placeholder or captured from stream if available
    let outputText = '';

    for await (const chunk of responseStream) {
      if (chunk.text) {
        outputText += chunk.text;
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }

    // Attempt to guess token usage or use chunk's usage metadata if the SDK provides it on the last chunk
    const latencyMs = Date.now() - startTime;
    const estimatedInputTokens = (question.length + chunks.map(c => c.text).join('').length) / 4;
    const estimatedOutputTokens = outputText.length / 4;
    const finalTotalTokens = Math.floor(estimatedInputTokens + estimatedOutputTokens);

    await UsageService.recordUsage({
      userId,
      documentId,
      model: model,
      inputTokens: Math.floor(estimatedInputTokens),
      outputTokens: Math.floor(estimatedOutputTokens),
      totalTokens: finalTotalTokens,
      latencyMs
    });

    const sources = chunks.map(c => ({ documentId, chunkIndex: c.chunkIndex, score: c.score }));

    // Send final done event with sources
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();

  } catch (error: any) {
    if (error?.name === 'ZodError') {
      res.status(400).json({ success: false, message: error.errors?.[0]?.message || 'Validation failed' });
    } else {
      console.error('Stream chat error:', error);
      if (!res.headersSent) {
        const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
        const statusCode = isRateLimit ? 429 : 500;
        const message = isRateLimit ? 'AI service quota exceeded or rate limited. Please try again later.' : 'Internal server error during stream';
        res.status(statusCode).json({ success: false, message });
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Internal server error occurred mid-stream' })}\n\n`);
        res.end();
      }
    }
  }
};
