import { Router } from 'express';
import { uploadDocument, getDocuments, getDocument, deleteDocument, searchDocument } from '../controllers/document.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

import { formatErrorResponse } from '../utils/errors';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ext === '.pdf' ? '.pdf' : '';
    cb(null, `${crypto.randomUUID()}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdfMime && isPdfExt) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

const handleUploadError = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json(
          formatErrorResponse('PAYLOAD_TOO_LARGE', 'File is too large (max 10MB)', [
            { field: 'file', message: 'File exceeds 10MB limit' },
          ])
        );
      }
      return res.status(400).json(formatErrorResponse('VALIDATION_ERROR', err.message, [{ field: 'file', message: err.message }]));
    } else if (err) {
      return res.status(400).json(formatErrorResponse('VALIDATION_ERROR', err.message, [{ field: 'file', message: err.message }]));
    }
    next();
  });
};

router.post('/', authMiddleware, handleUploadError, uploadDocument);
router.get('/', authMiddleware, getDocuments);
router.get('/:id', authMiddleware, getDocument);
router.delete('/:id', authMiddleware, deleteDocument);
router.post('/:id/search', authMiddleware, searchDocument);

export default router;
