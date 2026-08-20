import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  email: z.string().trim().email('Invalid email format').max(255, 'Email cannot exceed 255 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(100, 'Password cannot exceed 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const searchSchema = z.object({
  query: z.string().trim().min(1, 'Search query is required').max(1000, 'Query cannot exceed 1000 characters'),
});

export const chatSchema = z.object({
  documentId: z.string().trim().min(1, 'Document ID is required').max(100, 'Invalid document ID'),
  question: z.string().trim().min(1, 'Question is required').max(2000, 'Question cannot exceed 2000 characters'),
});

export const agentSchema = z.object({
  documentId: z.string().trim().min(1, 'Document ID is required').max(100, 'Invalid document ID'),
  message: z.string().trim().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
});

export const createOrderSchema = z.object({
  plan: z.enum(['PRO']).default('PRO'),
  amount: z.number().int().positive().default(49900),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().trim().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().trim().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().trim().min(1, 'Signature is required'),
});
