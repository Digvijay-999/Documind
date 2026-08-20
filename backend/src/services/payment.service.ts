import Razorpay from 'razorpay';
import crypto from 'crypto';

export class PaymentService {
  private razorpay: Razorpay | null = null;
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_documind_test_key';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'documind_test_secret_for_dev_mode';

    if (this.keyId && this.keySecret) {
      try {
        this.razorpay = new Razorpay({
          key_id: this.keyId,
          key_secret: this.keySecret,
        });
      } catch (err) {
        console.warn('Failed to initialize Razorpay SDK instance:', err);
      }
    }
  }

  public getKeyId(): string {
    return this.keyId;
  }

  /**
   * Create an order on Razorpay for subscription upgrade.
   * Default amount: ₹499 (49900 paise)
   */
  public async createOrder(userId: string, plan: string = 'PRO', amount: number = 49900) {
    const currency = 'INR';
    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;

    if (this.razorpay) {
      try {
        const order = await this.razorpay.orders.create({
          amount,
          currency,
          receipt,
          notes: {
            userId,
            plan,
          },
        });

        return {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: this.keyId,
          receipt: order.receipt,
        };
      } catch (err: any) {
        console.warn('Razorpay API call failed, generating deterministic development test order:', err?.message || err);
      }
    }

    // Fallback development order creation for offline/test environments
    const mockOrderId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
    return {
      id: mockOrderId,
      amount,
      currency,
      keyId: this.keyId,
      receipt,
    };
  }

  /**
   * Server-side signature verification using HMAC SHA256
   * generated_signature = hmac_sha256(order_id + "|" + razorpay_payment_id, secret)
   */
  public verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(payload)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
  }
}
