import { Router } from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/create-order', authMiddleware, createOrder);
router.post('/verify', authMiddleware, verifyPayment);

export default router;
