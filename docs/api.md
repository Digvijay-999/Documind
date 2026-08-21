# DocuMind AI — REST API, Swagger & Error Architecture

This document provides a comprehensive overview of the DocuMind AI backend API architecture, OpenAPI / Swagger documentation, standardized error response structure, input validation schemas, file upload security, and viva defense preparation.

---

## 1. OpenAPI & Swagger Documentation

DocuMind AI implements interactive API documentation using **OpenAPI 3.0.0** and **Swagger UI**.

* **Interactive Swagger UI**: `http://localhost:5000/api-docs`
* **Raw OpenAPI 3.0 JSON Specification**: `http://localhost:5000/api-docs/swagger.json`

### Authentication in Swagger UI
Click **Authorize** (top right) in Swagger UI and provide your JWT Bearer token:
```text
Bearer <your_jwt_token>
```

---

## 2. API Endpoint Matrix

| Tag | Method | Endpoint | Auth | Description | Status Codes |
|---|---|---|---|---|---|
| **Health & Stats** | `GET` | `/api/health` | Public | System health check | `200` |
| **Health & Stats** | `GET` | `/api/public/stats` | Public | Aggregate platform statistics | `200` |
| **Auth** | `POST` | `/api/auth/register` | Public | Create new user account | `201`, `400`, `409`, `500` |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate user & return JWT | `200`, `400`, `401`, `500` |
| **Auth** | `GET` | `/api/auth/me` | Bearer JWT | Retrieve current user profile | `200`, `401`, `404`, `500` |
| **Documents** | `POST` | `/api/documents` | Bearer JWT | Upload PDF (max 10MB) & trigger ingestion | `201`, `400`, `401`, `413`, `500` |
| **Documents** | `GET` | `/api/documents` | Bearer JWT | List documents owned by user | `200`, `401`, `500` |
| **Documents** | `GET` | `/api/documents/:id` | Bearer JWT | Get metadata for a specific document | `200`, `401`, `404`, `500` |
| **Documents** | `DELETE` | `/api/documents/:id` | Bearer JWT | Transactional delete of doc, vectors & file | `200`, `401`, `404`, `500` |
| **Documents** | `POST` | `/api/documents/:id/search`| Bearer JWT | Vector similarity search in ChromaDB | `200`, `400`, `401`, `404`, `500` |
| **AI & RAG** | `POST` | `/api/ai/chat` | Bearer JWT | Synchronous RAG question answering | `200`, `400`, `401`, `404`, `429`, `500` |
| **AI & RAG** | `POST` | `/api/ai/chat/stream` | Bearer JWT | Server-Sent Events (SSE) token streaming | `200`, `400`, `401`, `404`, `429`, `500` |
| **AI & RAG** | `POST` | `/api/ai/agent` | Bearer JWT | Autonomous agent (summary, quiz, search) | `200`, `400`, `401`, `404`, `429`, `500` |
| **Chat History** | `GET` | `/api/chat/sessions/:documentId` | Bearer JWT | MongoDB persistent chat history | `200`, `401`, `404`, `500` |
| **Payments** | `POST` | `/api/payments/create-order` | Bearer JWT | Create Razorpay order for ₹499 | `200`, `401`, `500` |
| **Payments** | `POST` | `/api/payments/verify` | Bearer JWT | Verify HMAC signature & upgrade to PRO | `200`, `400`, `401`, `500` |
| **Admin** | `GET` | `/api/admin/documents` | Admin JWT | Cross-user document audit with SQL JOIN | `200`, `401`, `403`, `500` |
| **Admin** | `GET` | `/api/admin/chat-stats` | Admin JWT | Aggregation pipeline ($match, $group, $sort) | `200`, `401`, `403`, `500` |

---

## 3. Standardized Error Response Format

All error responses across the entire backend adhere to a predictable structure:

```json
{
  "success": false,
  "message": "Human-readable summary of the error",
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Human-readable summary of the error",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### Error Code Hierarchy

| Status Code | Error Code | Scenario | Example Response |
|---|---|---|---|
| `400` | `VALIDATION_ERROR` | Request body failed Zod schema parsing | Missing fields, bad format, invalid range |
| `401` | `UNAUTHORIZED` | Missing, malformed, or expired JWT | Header missing `Bearer <token>` |
| `403` | `FORBIDDEN` | Authenticated user lacks required role | Regular user accessing `/api/admin/*` |
| `404` | `NOT_FOUND` | Resource does not exist or user is unauthorized owner | Document UUID not found or belongs to another user |
| `409` | `CONFLICT` | Resource collision | Attempting to register existing email address |
| `413` | `PAYLOAD_TOO_LARGE` | Upload exceeds maximum file size | PDF file larger than 10MB |
| `429` | `RATE_LIMITED` | Redis rate limiter triggered | Exceeded hourly AI query quota |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server exception | Database connectivity failure, unhandled crash |

### Error Masking Security
* In **Development** (`NODE_ENV !== 'production'`), error details and exception messages are logged for rapid diagnostics.
* In **Production** (`NODE_ENV === 'production'`), 500 errors return a generic `"Internal server error"` string without leaking internal stack traces, filesystem paths, database connection strings, or third-party API keys to the client.

---

## 4. Request Validation Audit (Zod)

Every client-controlled input is parsed through strongly-typed **Zod** schemas defined in `src/utils/validation.ts`:

1. **User Registration (`registerSchema`)**:
   - `name`: String, 1–100 characters.
   - `email`: Valid RFC 5322 email string, max 255 characters.
   - `password`: String, minimum 6 characters, maximum 100 characters.
2. **User Login (`loginSchema`)**:
   - `email`: Valid email format.
   - `password`: Minimum 1 character.
3. **Semantic Search (`searchSchema`)**:
   - `query`: String, 1–1000 characters.
4. **AI & Agent Q&A (`chatSchema`, `agentSchema`)**:
   - `documentId`: Valid document identifier.
   - `question` / `message`: String, 1–2000 characters.
5. **Payment Ordering (`createOrderSchema`)**:
   - `plan`: Enum `['PRO']`.
   - `amount`: Positive integer (paise).
6. **Payment Signature Verification (`verifyPaymentSchema`)**:
   - `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`: Non-empty strings.

---

## 5. File Upload Security Audit

PDF ingestion implements strict multi-layer defense:

* **MIME Type & Extension Whitelisting**: Multer enforces both `file.mimetype === 'application/pdf'` and `path.extname(file.originalname).toLowerCase() === '.pdf'`.
* **Payload Size Limit**: Hard ceiling of **10MB** (`10 * 1024 * 1024` bytes) rejecting oversized requests with HTTP 413.
* **Path Traversal Defense**: Original filenames are discarded for disk storage; files are renamed using cryptographically secure UUIDs (`crypto.randomUUID() + '.pdf'`).
* **Tenant Isolation**: Uploaded documents are strictly associated with the authenticated `req.user.id`.

---

## 6. Viva Defense Q&A

### Q1: Why do we use OpenAPI / Swagger documentation?
> **Answer**: Swagger/OpenAPI provides an interactive, standardized machine-readable API specification. It allows developers, frontend clients, and external evaluators to test REST endpoints directly from the browser, inspect data models, view required parameters, and verify response formats without external tools like Postman.

### Q2: Why is having a uniform error response format important?
> **Answer**: A consistent error response format (e.g. `{ success: false, message, error: { code, details } }`) allows client applications to handle failures gracefully. The frontend can programmatically display field-level validation errors using `error.details` or switch based on `error.code` (e.g. redirecting to login on `UNAUTHORIZED` vs showing an upgrade modal on `RATE_LIMITED`).

### Q3: What is the difference between HTTP 401 and HTTP 403?
> **Answer**:
> - **401 Unauthorized**: Authentication is missing or invalid (the server doesn't know who you are, e.g. missing or expired JWT token).
> - **403 Forbidden**: Authentication succeeded, but the user does not possess sufficient privileges or roles to access the resource (e.g. a regular `USER` trying to access `/api/admin/documents`).

### Q4: Why return HTTP 404 instead of 403 when a user accesses another user's document?
> **Answer**: Returning `404 Not Found` prevents **information enumeration / resource disclosure attacks**. If the server returned `403 Forbidden`, an attacker could discover that a specific private document ID actually exists in the database. Returning `404` hides the existence of the resource entirely.
