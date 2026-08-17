import { Router } from 'express';
import { chatWithDocument, streamChatWithDocument } from '../controllers/ai.controller';
import { runAgent } from '../controllers/agent.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/chat', authMiddleware, chatWithDocument);
router.post('/chat/stream', authMiddleware, streamChatWithDocument);
router.post('/agent', authMiddleware, runAgent);

export default router;
