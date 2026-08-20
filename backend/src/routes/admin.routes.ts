import { Router } from 'express';
import { getAllDocuments } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';

const router = Router();

// Endpoint demonstrating SQL JOIN via Prisma
// GET /api/admin/documents
router.get('/documents', authMiddleware, requireAdmin, getAllDocuments);

export default router;
