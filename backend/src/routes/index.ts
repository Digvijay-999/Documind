import { Router, Request, Response } from 'express';

import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import documentRoutes from './document.routes';
import aiRoutes from './ai.routes';
import chatRoutes from './chat.routes';

import publicRoutes from './public.routes';
import paymentRoutes from './payment.routes';
import { generalRateLimit } from '../middleware/rateLimiter';

const router = Router();

// General rate limiter applied across all /api routes
router.use(generalRateLimit);

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
router.use('/chat', chatRoutes);
router.use('/payments', paymentRoutes);
router.use('/public', publicRoutes);

export default router;
