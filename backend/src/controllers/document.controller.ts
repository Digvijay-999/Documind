import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import fs from 'fs';
import path from 'path';
const pdfParse = require('pdf-parse');
import { AuthRequest } from '../middleware/authMiddleware';

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const file = req.file;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  if (!file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  if (file.mimetype !== 'application/pdf') {
    fs.promises.unlink(file.path).catch(console.error);
    res.status(400).json({ success: false, message: 'Only PDF files are allowed' });
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

    // Process PDF synchronously in the background (no queue yet)
    try {
      const dataBuffer = await fs.promises.readFile(file.path);
      const data = await (pdfParse as any)(dataBuffer);

      await prisma.document.update({
        where: { id: document.id },
        data: {
          extractedText: data.text,
          status: 'READY',
        },
      });
    } catch (parseError) {
      console.error('PDF processing failed:', parseError);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      });
    }
  } catch (error) {
    console.error('Document upload error:', error);
    fs.promises.unlink(file.path).catch(console.error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const documentId = req.params.id as string;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      res.status(404).json({ success: false, message: 'Document not found' });
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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const documentId = req.params.id as string;

  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.userId !== userId) {
      res.status(404).json({ success: false, message: 'Document not found' });
      return;
    }

    await prisma.document.delete({ where: { id: documentId } });

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
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
