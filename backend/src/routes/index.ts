import { Router, Request, Response } from 'express';

import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import aiRoutes from './ai.routes';

const router = Router();

// Health Check Endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'DocuMind API is running'
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentRoutes);
router.use('/ai', aiRoutes);

export default router;
