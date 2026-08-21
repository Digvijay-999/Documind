# Low-Level Design (LLD) — DocuMind AI

**Project Name**: DocuMind AI  
**Language / Runtime**: TypeScript 5.x / Node.js 20+  
**Frameworks**: Express.js (Backend) / Next.js 16 (Frontend)  
**Database Tooling**: Prisma ORM (PostgreSQL), Mongoose (MongoDB), ioredis (Redis), chromadb (ChromaDB)  

---

## 1. Directory Structure

```
backend/
├── src/
│   ├── agents/
│   │   └── document.agent.ts       # Multi-step autonomous agent with tool dispatching
│   ├── config/
│   │   ├── redis.ts                # Redis connection client and cache utilities
│   │   └── swagger.ts              # OpenAPI 3.0 JSDoc configuration
│   ├── controllers/
│   │   ├── admin.controller.ts     # SQL JOIN admin docs & MongoDB aggregate chat stats
│   │   ├── agent.controller.ts     # Agent execution endpoint handler
│   │   ├── ai.controller.ts        # RAG Q&A, streaming SSE, and summary/quiz endpoints
│   │   ├── auth.controller.ts      # User registration, login, and profile
│   │   ├── document.controller.ts  # PDF upload, status polling, and deletion
│   │   ├── payment.controller.ts   # Razorpay order creation and webhook/signature verify
│   │   └── stats.controller.ts     # Public platform metrics endpoint
│   ├── jobs/
│   │   └── usage-cleanup.job.ts    # Scheduled cron task for purging old usage logs
│   ├── middleware/
│   │   ├── adminMiddleware.ts      # RBAC authorization enforcement (ADMIN only)
│   │   ├── authMiddleware.ts       # JWT authentication and request context binding
│   │   ├── cacheMiddleware.ts      # Redis Cache-Aside response caching
│   │   ├── errorHandler.ts         # Centralized error formatting envelope
│   │   └── rateLimiter.ts          # Redis sliding-window tiered rate limiters
│   ├── models/
│   │   └── ChatSession.ts          # Mongoose schema (Referencing User/Doc + Embedded Messages)
│   ├── routes/
│   │   ├── admin.routes.ts         # /api/admin/documents, /api/admin/chat-stats
│   │   ├── agent.routes.ts         # /api/agent/run
│   │   ├── ai.routes.ts            # /api/ai/ask, /api/ai/ask-stream, /api/ai/summary, /api/ai/quiz
│   │   ├── auth.routes.ts          # /api/auth/register, /api/auth/login, /api/auth/me
│   │   ├── document.routes.ts      # /api/documents, /api/documents/:id, /api/documents/:id/status
│   │   ├── index.ts                # Master router aggregating all sub-routes
│   │   ├── payment.routes.ts       # /api/payments/create-order, /api/payments/verify
│   │   └── stats.routes.ts         # /api/public/stats
│   ├── services/
│   │   ├── cache.service.ts        # Cache-Aside get/set/invalidate wrapper
│   │   ├── embedding.service.ts    # OpenRouter NVIDIA Nemotron-3 (2048d) client
│   │   ├── groq.service.ts         # Groq LLaMA 3.3 70B text generation and streaming
│   │   ├── payment.service.ts      # Razorpay SDK integration and HMAC SHA-256 validation
│   │   ├── rag.service.ts          # Vector similarity retrieval and RAG prompt synthesis
│   │   ├── usage.service.ts        # Token, latency, and cost calculator & logger
│   │   └── vector.service.ts       # ChromaDB collection management and cosine search
│   ├── tools/
│   │   ├── generateQuiz.ts         # Tool generating structured multi-choice quiz JSON
│   │   ├── generateSummary.ts      # Tool generating structured summaries and key points
│   │   └── searchDocument.ts       # Tool executing semantic similarity search
│   ├── utils/
│   │   ├── errors.ts               # Standardized AppError and error formatters
│   │   └── prisma.ts               # Singleton Prisma client instance
│   ├── websocket/
│   │   └── socket.service.ts       # Socket.IO lifecycle manager and status emitter
│   └── server.ts                   # Express app configuration and HTTP/WS server bootstrap
├── evals/
│   ├── evaluate.ts                 # Automated LLM evaluation script
│   └── questions.json              # Curated factual, conceptual, and comparison evaluation dataset
├── prisma/
│   └── schema.prisma               # PostgreSQL relational models and relations
└── tests/                          # 17 automated test suites (93+ unit and integration tests)
```

---

## 2. Core Modules & Class Interfaces

### 2.1 `DocumentAgent` ([src/agents/document.agent.ts](file:///c:/Projects/documind/documind-ai/backend/src/agents/document.agent.ts))
* **Purpose**: Orchestrates autonomous tool execution over documents.
* **Key Methods**:
  * `run(userId: string, documentId: string, userPrompt: string)`: Executes iterative tool selection loop with a maximum boundary of `MAX_AGENT_STEPS = 5`.
  * Evaluates function calls returned by Groq LLaMA 3.3, dispatches to `searchDocument`, `generateSummary`, or `generateQuiz`, and returns combined synthesis.

### 2.2 `RagService` ([src/services/rag.service.ts](file:///c:/Projects/documind/documind-ai/backend/src/services/rag.service.ts))
* **Purpose**: Performs cosine vector search in ChromaDB and constructs prompt context with strict trust boundaries.
* **Key Methods**:
  * `answerQuestion(userId, documentId, question)`: Embeds question, queries top chunks from ChromaDB, constructs `<document_context>`, calls Groq, verifies citation authenticity, and logs AI token usage.
  * `streamAnswer(userId, documentId, question, onChunk)`: Asynchronously streams token chunks via Server-Sent Events (SSE).

### 2.3 `EmbeddingService` ([src/services/embedding.service.ts](file:///c:/Projects/documind/documind-ai/backend/src/services/embedding.service.ts))
* **Purpose**: Generates high-dimensional vector embeddings.
* **Model**: NVIDIA Nemotron-3 (`nvidia/nemotron-3-embed-1b:free`) via OpenRouter API.
* **Dimension**: 2048-dimensional dense vector embeddings.

### 2.4 `PaymentService` ([src/services/payment.service.ts](file:///c:/Projects/documind/documind-ai/backend/src/services/payment.service.ts))
* **Purpose**: Manages Razorpay Test Mode transactions.
* **Key Methods**:
  * `createOrder(amount, currency)`: Generates Razorpay Order ID.
  * `verifySignature(orderId, paymentId, signature)`: Computes `crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex')` using constant-time string comparison.

### 2.5 `SocketService` ([src/websocket/socket.service.ts](file:///c:/Projects/documind/documind-ai/backend/src/websocket/socket.service.ts))
* **Purpose**: Manages real-time WebSocket communication via Socket.IO.
* **Key Methods**:
  * `init(server)`: Attaches Socket.IO with JWT authentication middleware.
  * `emitDocumentStatus(userId, documentId, status, stage, message, progress)`: Broadcasts real-time ingestion stage to private room `user:${userId}`.

---

## 3. Database Entity Schemas

### 3.1 PostgreSQL Schema (`prisma/schema.prisma`)
```prisma
model User {
  id                 String             @id @default(uuid())
  name               String
  email              String             @unique
  passwordHash       String
  role               Role               @default(USER)
  subscriptionPlan   SubscriptionPlan   @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  razorpayCustomerId String?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  documents          Document[]
  aiUsages           AIUsage[]

  @@map("users")
}

model Document {
  id               String         @id @default(uuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  name             String
  originalFileName String
  filePath         String
  fileSize         Int
  mimeType         String
  status           DocumentStatus @default(UPLOADED)
  extractedText    String?        @db.Text
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  aiUsages         AIUsage[]

  @@index([userId])
  @@index([createdAt])
}

model AIUsage {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  provider      String   @default("groq")
  model         String
  inputTokens   Int
  outputTokens  Int
  totalTokens   Int
  latencyMs     Int
  estimatedCost Float
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([documentId])
  @@index([createdAt])
}
```

### 3.2 MongoDB Schema (`src/models/ChatSession.ts`)
```typescript
export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  userId: string;       // Foreign Reference to PostgreSQL User UUID
  documentId: string;   // Foreign Reference to PostgreSQL Document UUID
  messages: IMessage[]; // Embedded message subdocuments
  createdAt: Date;
  updatedAt: Date;
}
```
