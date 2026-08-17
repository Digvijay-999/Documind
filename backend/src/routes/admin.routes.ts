import { Router } from 'express';
import { getAdminTest } from '../controllers/admin.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.get('/test', authMiddleware, requireRole('ADMIN'), getAdminTest);

export default router;
