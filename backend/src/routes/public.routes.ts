import { Router } from 'express';
import { getPublicStats } from '../controllers/public.controller';

const router = Router();

// GET /api/public/stats
router.get('/stats', getPublicStats);

export default router;
