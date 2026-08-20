import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import prisma from '../utils/prisma';
import { z } from 'zod';
import { RagService } from '../services/rag.service';
import { UsageService } from '../services/usage.service';
import { ChatSession } from '../models/ChatSession';
import { redisClient } from '../config/redis';
import { chatSchema } from '../utils/validation';
import { formatErrorResponse } from '../utils/errors';
import crypto from 'crypto';

const ragService = new RagService();

export const chatWithDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const { documentId, question } = chatSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Document is not fully processed yet'));
      return;
    }

    // Generate cache key
    const normalizedQuestion = question.trim().toLowerCase();
    const hash = crypto.createHash('sha256').update(normalizedQuestion).digest('hex');
    const cacheKey = `ai:answer:${userId}:${documentId}:${hash}`;

    // Check Redis Cache
    if (redisClient.isOpen) {
      try {
        const cachedData = await redisClient.get(cacheKey);
        if (cachedData) {
          const cachedAnswer = JSON.parse(cachedData);
          console.log('AI cache HIT');
          res.status(200).json({
            success: true,
            data: cachedAnswer
          });
          return;
        } else {
          console.log('AI cache MISS');
        }
      } catch (err) {
        console.error('Redis get error:', err);
      }
    }

    const result = await ragService.answerQuestion(userId, documentId, question);

    // Save to Redis Cache (TTL: 10 minutes)
    if (redisClient.isOpen) {
      try {
        await redisClient.setEx(cacheKey, 600, JSON.stringify(result));
        console.log('AI cache SET');
      } catch (err) {
        console.error('Redis set error:', err);
      }
    }

    // Save chat history to MongoDB
    try {
      const chatSession = await ChatSession.findOneAndUpdate(
        { userId, documentId },
        { $setOnInsert: { userId, documentId } },
        { upsert: true, new: true }
      );
      chatSession.messages.push({ role: 'user', content: question, createdAt: new Date() });
      chatSession.messages.push({ role: 'assistant', content: result.answer || JSON.stringify(result), createdAt: new Date() });
      await chatSession.save();
    } catch (err) {
      console.error('Failed to save chat to MongoDB:', err);
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
    } else {
      console.error('Chat error:', error);
      res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error during chat'));
    }
  }
};

export const streamChatWithDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    console.log('[CHAT STREAM] authenticated');
    const { documentId, question } = chatSchema.parse(req.body);

    const document = await prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Document is not fully processed yet'));
      return;
    }

    console.log('[CHAT STREAM] document verified');
    const startTime = Date.now();
    const { responseStream, chunks, model } = await ragService.streamAnswer(documentId, question);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let outputText = '';

    console.log("RESPONSE_STREAM:", responseStream);
    for await (const chunk of responseStream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        outputText += content;
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

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

    // Save chat history to MongoDB
    try {
      const chatSession = await ChatSession.findOneAndUpdate(
        { userId, documentId },
        { $setOnInsert: { userId, documentId } },
        { upsert: true, new: true }
      );
      chatSession.messages.push({ role: 'user', content: question, createdAt: new Date() });
      chatSession.messages.push({ role: 'assistant', content: outputText, createdAt: new Date() });
      await chatSession.save();
    } catch (err) {
      console.error('Failed to save chat to MongoDB:', err);
    }

    // Send final done event with sources
    res.write(`data: ${JSON.stringify({ done: true, sources })}\n\n`);
    res.end();

  } catch (error: any) {
    if (error instanceof z.ZodError || error?.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
    } else {
      console.error('Stream chat error:', error);
      if (!res.headersSent) {
        const isRateLimit = error?.status === 429 || error?.code === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
        const statusCode = isRateLimit ? 429 : 500;
        const code = isRateLimit ? 'RATE_LIMITED' : 'INTERNAL_SERVER_ERROR';
        const message = isRateLimit ? 'AI service quota exceeded or rate limited. Please try again later.' : 'Internal server error during stream';
        res.status(statusCode).json(formatErrorResponse(code, message));
      } else {
        res.write(`data: ${JSON.stringify({ error: 'Internal server error occurred mid-stream' })}\n\n`);
        res.end();
      }
    }
  }
};
