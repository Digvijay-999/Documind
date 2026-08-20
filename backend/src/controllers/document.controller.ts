import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import fs from 'fs';
import path from 'path';
import pdfParse = require('pdf-parse');
import { AuthRequest } from '../middleware/authMiddleware';

import { ChunkingService } from '../services/chunking.service';
import { EmbeddingService } from '../services/embedding.service';
import { VectorService } from '../services/vector.service';
import { RagService } from '../services/rag.service';
import { emitDocumentStatus } from '../websocket/socket.service';
import { searchSchema } from '../utils/validation';
import { formatErrorResponse } from '../utils/errors';
import { z } from 'zod';

const embeddingService = new EmbeddingService();
const vectorService = new VectorService();
const ragService = new RagService();

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const file = req.file;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  if (!file) {
    res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'No file uploaded', [{ field: 'file', message: 'PDF file is required' }]));
    return;
  }

  if (file.mimetype !== 'application/pdf') {
    fs.promises.unlink(file.path).catch(console.error);
    res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Only PDF files are allowed', [{ field: 'file', message: 'MIME type must be application/pdf' }]));
    return;
  }

  try {
    const document = await prisma.document.create({
      data: {
        userId,
        name: file.originalname,
        originalFileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        mimeType: file.mimetype,
        status: 'PROCESSING',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: document.id,
        name: document.name,
        originalFileName: document.originalFileName,
        fileSize: document.fileSize,
        status: document.status,
      },
    });

    // Real-time WebSocket: Upload stage
    emitDocumentStatus(userId, {
      documentId: document.id,
      status: 'PROCESSING',
      stage: 'uploading',
      message: 'Upload received',
      progress: 15,
    });

    // Process PDF synchronously in the background (no queue yet)
    try {
      emitDocumentStatus(userId, {
        documentId: document.id,
        status: 'PROCESSING',
        stage: 'extracting',
        message: 'Extracting text from PDF...',
        progress: 35,
      });

      const dataBuffer = await fs.promises.readFile(file.path);
      const data = await pdfParse(dataBuffer);
      const extractedText = data.text;

      // Pipeline: Chunking -> Embedding -> Vector DB
      console.log(`Extracting text for ${document.id}. Text length: ${extractedText.length}`);
      
      emitDocumentStatus(userId, {
        documentId: document.id,
        status: 'PROCESSING',
        stage: 'chunking',
        message: 'Generating text chunks...',
        progress: 55,
      });

      const chunks = ChunkingService.chunkText(extractedText);
      console.log(`Generated ${chunks.length} chunks for ${document.id}`);

      if (chunks.length > 0) {
        // Clear any old vectors just in case it's a reprocess
        await vectorService.deleteDocument(document.id);

        emitDocumentStatus(userId, {
          documentId: document.id,
          status: 'PROCESSING',
          stage: 'embedding',
          message: 'Generating embeddings with Nemotron...',
          progress: 75,
        });

        const texts = chunks.map(c => c.text);
        console.log(`Generating embeddings for ${document.id}...`);
        const embeddings = await embeddingService.generateEmbeddings(texts);
        console.log(`Embeddings generated. Storing in ChromaDB...`);

        emitDocumentStatus(userId, {
          documentId: document.id,
          status: 'PROCESSING',
          stage: 'storing_vectors',
          message: 'Indexing vectors in ChromaDB...',
          progress: 90,
        });

        const metadatas = chunks.map(c => ({
          documentId: document.id,
          chunkIndex: c.chunkIndex,
          originalFileName: file.originalname
        }));

        await vectorService.addChunks(document.id, texts, embeddings, metadatas);
      }

      await prisma.document.update({
        where: { id: document.id },
        data: {
          extractedText: extractedText,
          status: 'READY',
        },
      });
      console.log(`Document ${document.id} processed successfully.`);

      emitDocumentStatus(userId, {
        documentId: document.id,
        status: 'READY',
        stage: 'completed',
        message: 'Document ready ✓',
        progress: 100,
      });
    } catch (parseError) {
      console.error('Document processing failed:', parseError);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      });

      emitDocumentStatus(userId, {
        documentId: document.id,
        status: 'FAILED',
        stage: 'error',
        message: 'Document processing failed',
      });
    }
  } catch (error) {
    console.error('Document upload error:', error);
    fs.promises.unlink(file.path).catch(console.error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const documents = await prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        originalFileName: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.status(200).json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const getDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const documentId = req.params.id as string;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found'));
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: document.id,
        name: document.name,
        originalFileName: document.originalFileName,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
        extractedTextLength: document.extractedText ? document.extractedText.length : 0,
      },
    });
  } catch (error) {
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const documentId = req.params.id as string;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found'));
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Delete associated AIUsage records explicitly
      await tx.aIUsage.deleteMany({ where: { documentId } });
      
      // Delete the Document itself
      await tx.document.delete({ where: { id: documentId } });
    });

    await vectorService.deleteDocument(documentId);

    // Try to delete the file
    try {
      if (fs.existsSync(document.filePath)) {
        await fs.promises.unlink(document.filePath);
      }
    } catch (fsError) {
      console.error(`Failed to delete file ${document.filePath}:`, fsError);
    }

    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const searchDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const documentId = req.params.id as string;

  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const validatedData = searchSchema.parse(req.body);

    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document || document.userId !== userId) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'Document not found or unauthorized'));
      return;
    }

    if (document.status !== 'READY') {
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Document is not fully processed yet'));
      return;
    }

    console.log(`Searching for "${validatedData.query}" in document ${documentId}`);
    const results = await ragService.retrieveRelevantChunks(documentId, validatedData.query, 5);

    res.status(200).json({
      success: true,
      results
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      const details = error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Validation failed';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
    } else {
      console.error('Search error:', error);
      res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error during search'));
    }
  }
};
