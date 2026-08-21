import request from 'supertest';
import app from '../src/server';
import prisma from '../src/utils/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'documind_test_secret_for_dev_mode';

describe('Payment API (Razorpay Test Mode)', () => {
  const userId = 'user-payment-test-uuid';
  const validToken = jwt.sign({ id: userId, role: 'USER' }, JWT_SECRET);

  beforeAll(async () => {
    try {
      // Create test user in PostgreSQL
      await prisma.user.upsert({
        where: { id: userId },
        update: { subscriptionPlan: 'FREE', subscriptionStatus: 'ACTIVE' },
        create: {
          id: userId,
          name: 'Payment Tester',
          email: 'payment-tester@documind.ai',
          passwordHash: 'hashed_password_placeholder',
          subscriptionPlan: 'FREE',
          subscriptionStatus: 'ACTIVE',
        },
      });
    } catch (e) {
      // Database daemon not active during mock test execution
    }
  });

  afterAll(async () => {
    try {
      await prisma.user.deleteMany({
        where: { email: 'payment-tester@documind.ai' },
      });
    } catch (e) {
      // Database daemon not active during mock test execution
    }
  });

  it('1. Missing JWT -> 401 Unauthorized', async () => {
    const res = await request(app).post('/api/payments/create-order');
    expect(res.status).toBe(401);
  });

  it('2. Invalid payment verification request (missing fields) -> 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ razorpay_order_id: 'order_123' }); // missing payment_id and signature

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('3. Payment verification with invalid signature -> 400 Rejected', async () => {
    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456',
        razorpay_signature: 'invalid_tampered_signature_hex_1234567890',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('signature');
  });

  it('4. Successful verified signature -> User upgraded to PRO', async () => {
    const orderId = 'order_test_valid_999';
    const paymentId = 'pay_test_valid_888';

    // Compute legitimate HMAC SHA-256 signature
    const validSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/verify')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSignature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.subscriptionPlan).toBe('PRO');

    // Confirm persisted in PostgreSQL
    const updatedUser = await prisma.user.findUnique({ where: { id: userId } });
    expect(updatedUser?.subscriptionPlan).toBe('PRO');
  });
});
