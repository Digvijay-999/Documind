import { Router, Request, Response } from 'express';

import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';

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

export default router;
