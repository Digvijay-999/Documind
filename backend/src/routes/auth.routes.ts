import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', authMiddleware, getMe);

export default router;
