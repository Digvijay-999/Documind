import { Router } from 'express';
import { getAllDocuments, getChatStats } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';

const router = Router();

// Endpoint demonstrating SQL JOIN via Prisma
// GET /api/admin/documents
router.get('/documents', authMiddleware, requireAdmin, getAllDocuments);

// Endpoint demonstrating MongoDB Aggregation Pipeline ($match, $group, $sort)
// GET /api/admin/chat-stats
router.get('/chat-stats', authMiddleware, requireAdmin, getChatStats);

export default router;
