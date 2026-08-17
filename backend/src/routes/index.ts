import { Router, Request, Response } from 'express';

const router = Router();

// Health Check Endpoint
router.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'DocuMind API is running'
  });
});

export default router;
