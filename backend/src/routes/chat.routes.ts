import { Router } from 'express';
import { getChatHistory, addChatMessage } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/sessions/:documentId', authMiddleware, getChatHistory);
router.post('/sessions/:documentId/messages', authMiddleware, addChatMessage);

export default router;
