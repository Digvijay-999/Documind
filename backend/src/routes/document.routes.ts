import { Router } from 'express';
import { uploadDocument, getDocuments, getDocument, deleteDocument } from '../controllers/document.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
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
        return res.status(413).json({ success: false, message: 'File is too large (max 10MB)' });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

router.post('/', authMiddleware, handleUploadError, uploadDocument);
router.get('/', authMiddleware, getDocuments);
router.get('/:id', authMiddleware, getDocument);
router.delete('/:id', authMiddleware, deleteDocument);

export default router;
