import { Router } from 'express';
import { register, login, getMe, googleAuth, googleAuthCallback } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimit, register);
router.post('/login', authRateLimit, login);
router.get('/me', authMiddleware, getMe);

// 3rd-Party OAuth 2.0 Integration
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);

export default router;
