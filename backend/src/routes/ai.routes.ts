import { Router } from 'express';
import { chatWithDocument, streamChatWithDocument } from '../controllers/ai.controller';
import { runAgent } from '../controllers/agent.controller';
import { authMiddleware } from '../middleware/authMiddleware';
import { aiRateLimit } from '../middleware/rateLimiter';

const router = Router();

router.post('/chat', authMiddleware, aiRateLimit, chatWithDocument);
router.post('/chat/stream', authMiddleware, aiRateLimit, streamChatWithDocument);
router.post('/agent', authMiddleware, aiRateLimit, runAgent);

export default router;
