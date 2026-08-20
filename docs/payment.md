# Payment Gateway Integration (Razorpay Test Mode)

## 1. Overview & Architecture

DocuMind AI integrates **Razorpay** in **Test Mode** to demonstrate a secure, production-grade subscription upgrade mechanism (`FREE` → `PRO`).

### Subscription Plans
* **FREE**: Standard limits (30 AI requests/hr, standard processing).
* **PRO**: Priority Nemotron-3 embeddings, accelerated vector indexing, and autonomous multi-tool agent capabilities (₹499/mo).

---

## 2. Complete Payment Sequence Flow

```
+----------+              +--------------------+             +------------------+             +-------------------+
| Frontend |              |  DocuMind Backend  |             |  Razorpay Cloud  |             | PostgreSQL (Prisma)|
+----+-----+              +---------+----------+             +--------+---------+             +---------+---------+
     |                              |                                 |                                 |
     | 1. POST /payments/create-order                                 |                                 |
     |----------------------------->|                                 |                                 |
     |                              | 2. razorpay.orders.create()     |                                 |
     |                              |-------------------------------->|                                 |
     |                              |                                 |                                 |
     |                              | 3. Order Created (order_id, amt)|                                 |
     |                              |<--------------------------------|                                 |
     | 4. Returns orderId + keyId   |                                 |                                 |
     |<-----------------------------|                                 |                                 |
     |                                                                |                                 |
     | 5. Opens Razorpay Modal (Card/UPI/NetBanking)                  |                                 |
     |--------------------------------------------------------------->|                                 |
     | 6. User completes test payment                                 |                                 |
     |<---------------------------------------------------------------|                                 |
     |    Returns: razorpay_order_id, razorpay_payment_id, signature  |                                 |
     |                                                                |                                 |
     | 7. POST /payments/verify                                       |                                 |
     |    { order_id, payment_id, signature }                         |                                 |
     |----------------------------->|                                 |                                 |
     |                              | 8. Verify HMAC-SHA256 Signature |                                 |
     |                              |    crypto.createHmac('sha256')  |                                 |
     |                              |                                 | 9. UPDATE User                  |
     |                              |                                 |    subscriptionPlan = 'PRO'     |
     |                              |------------------------------------------------------------------>|
     | 10. HTTP 200 { success: true}|                                 |                                 |
     |<-----------------------------|                                 |                                 |
     | 11. Flip UI to "PRO Active"  |                                 |                                 |
     +                              +                                 +                                 +
```

---

## 3. Security Principles

1. **Server-Side Order Creation**:
   * The order amount (e.g. ₹499 = 49900 paise) and currency (`INR`) are set server-side. The client cannot tamper with the price.
2. **Never Expose Key Secret**:
   * `RAZORPAY_KEY_ID` (public key) is sent to the client to render the checkout iframe.
   * `RAZORPAY_KEY_SECRET` (private secret) stays exclusively on the server in environment variables.
3. **Cryptographic Signature Verification**:
   * The backend does **not** rely on boolean flags (`paid: true`) from the client.
   * The backend generates:
     $$\text{expected\_signature} = \text{HMAC-SHA256}(\text{order\_id} \mathbin{\Vert} \text{"|"} \mathbin{\Vert} \text{payment\_id},\, \text{RAZORPAY\_KEY\_SECRET})$$
   * Uses `crypto.timingSafeEqual` to prevent timing attacks.
   * Only if the signature matches is the user upgraded to `PRO`.

---

## 4. Viva Questions & Answers

**Q1: Why do we need server-side signature verification instead of trusting the frontend?**
> *Answer*: A malicious client could intercept the HTTP response or spoof frontend JavaScript to send `{ success: true }` without actually paying. The HMAC SHA-256 signature generated with our private secret proves mathematically that the payment was processed and verified by Razorpay's servers.

**Q2: What is the difference between Key ID and Key Secret?**
> *Answer*: `Key ID` is a public identifier used by the client to identify the merchant account. `Key Secret` is a private cryptographic key used exclusively on the backend to authenticate API requests and verify digital signatures.

**Q3: How is subscription status tracked in the database?**
> *Answer*: We extended the Prisma `User` schema with `subscriptionPlan` (`FREE` | `PRO`) and `subscriptionStatus` (`ACTIVE` | `INACTIVE`). Upon signature verification, Prisma executes `prisma.user.update` to persist the upgraded plan.
