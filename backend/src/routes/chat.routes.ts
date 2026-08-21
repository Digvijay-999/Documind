import { Router } from 'express';
import { getChatHistory, addChatMessage, deleteChatHistory } from '../controllers/chat.controller';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// MongoDB CRUD Endpoints
router.get('/sessions/:documentId', authMiddleware, getChatHistory);
router.post('/sessions/:documentId/messages', authMiddleware, addChatMessage);
router.delete('/sessions/:documentId', authMiddleware, deleteChatHistory);

// RESTful direct resource aliases
router.get('/:documentId', authMiddleware, getChatHistory);
router.post('/:documentId', authMiddleware, addChatMessage);
router.delete('/:documentId', authMiddleware, deleteChatHistory);

export default router;
