import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { PaymentService } from '../services/payment.service';
import prisma from '../utils/prisma';
import { createOrderSchema, verifyPaymentSchema } from '../utils/validation';
import { formatErrorResponse } from '../utils/errors';

const paymentService = new PaymentService();

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json(formatErrorResponse('NOT_FOUND', 'User not found'));
      return;
    }

    const { plan, amount } = createOrderSchema.parse(req.body);

    const order = await paymentService.createOrder(userId, plan, amount);

    res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: order.keyId,
      },
    });
  } catch (error: any) {
    console.error('Failed to create payment order:', error?.message || error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json(formatErrorResponse('UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const validation = verifyPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      const details = validation.error.issues?.map((i: any) => ({ field: i.path.join('.'), message: i.message })) || [];
      const msg = details[0]?.message || 'Invalid payment details';
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', msg, details));
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

    const isValid = paymentService.verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      res.status(400).json(formatErrorResponse('VALIDATION_ERROR', 'Payment verification failed: Invalid signature'));
      return;
    }

    // Update user subscription to PRO
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: 'PRO',
        subscriptionStatus: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully. Welcome to DocuMind PRO!',
      data: updatedUser,
    });
  } catch (error: any) {
    console.error('Failed to verify payment:', error?.message || error);
    res.status(500).json(formatErrorResponse('INTERNAL_SERVER_ERROR', 'Internal server error'));
  }
};
