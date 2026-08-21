# Product Requirement Document (PRD) — DocuMind AI

**Project Name**: DocuMind AI  
**Version**: 1.1.0  
**Target Domain**: Enterprise & Academic Intelligent Document Retrieval, RAG Analysis & Autonomous Agents  
**Authors**: DocuMind Core Engineering Team  

---

## 1. Executive Summary & Vision

DocuMind AI is a full-stack, enterprise-grade AI Document Intelligence Platform that allows users to upload unstructured PDF documents, perform high-speed semantic retrieval, stream answers using state-of-the-art Large Language Models (Groq LLaMA 3.3 70B), interact with autonomous multi-step agents, and monitor usage in real-time.

The system combines hybrid polyglot persistence (PostgreSQL + Prisma for authoritative relational entities, MongoDB Atlas + Mongoose for conversational session history, Redis for caching and rate limiting, and ChromaDB for vector embeddings) with cryptographic payments (Razorpay Test Mode), full-duplex WebSocket status pipelines (Socket.IO), and Server-Side Rendering (Next.js Server Components).

---

## 2. Target Audience & User Personas

1. **Academic Researchers & Students**: Upload multi-page research PDFs, perform conversational RAG queries with verified citations, and generate multi-choice comprehension quizzes.
2. **Legal & Compliance Analysts**: Search dense contractual documents with cosine similarity vector retrieval and strict prompt injection isolation.
3. **System Administrators & Enterprise Teams**: Supervise system-wide document ownership, track per-query token and cost metrics, view aggregated chat analytics, and enforce tiered rate limiting.

---

## 3. Implemented Capabilities & Functional Requirements

### 3.1 Authentication, Authorization & Security
* **JWT Authentication**: Cryptographically signed JSON Web Tokens (HMAC SHA-256) with 24-hour expiration.
* **Password Hashing**: Salted password hashing via `bcrypt` (10 rounds).
* **Role-Based Access Control (RBAC)**: Enforces role segregation between `USER` and `ADMIN` across REST endpoints (`authMiddleware`, `adminMiddleware`).
* **Document Ownership Verification**: Strict database checks (`doc.userId === req.user.id`) on all vector, text, and tool operations.
* **Secrets Management**: Runtime environment variable injection (`.env`), zero hardcoded secrets, and complete Git ignore protection.

### 3.2 PDF Ingestion & Vector Retrieval Pipeline
* **Secure PDF Upload**: Multi-layer upload validation (strict MIME whitelist `application/pdf`, extension validation, 10MB file limit, UUID filename obfuscation).
* **Text Extraction & Chunking**: Sliding-window recursive text chunking (~500 tokens per chunk with 10% overlap).
* **High-Dimensional Embeddings**: 2048-dimensional dense vector embeddings using NVIDIA Nemotron-3 (`nvidia/nemotron-3-embed-1b:free`) via OpenRouter API.
* **Vector Indexing & Cosine Retrieval**: Vector storage, indexing, and similarity retrieval in ChromaDB.

### 3.3 AI Reasoning, Streaming & Autonomous Agents
* **RAG (Retrieval-Augmented Generation)**: Vector search retrieves top-k relevant chunks; injected into Groq LLaMA 3.3 70B context window.
* **Real-Time Token Streaming**: Server-Sent Events (SSE) streaming delivering sub-second first-token latency over HTTP.
* **Structured Outputs**: Zod-validated JSON responses for document summaries and comprehension quizzes.
* **Multi-Step Autonomous Agent (`DocumentAgent`)**: Multi-step tool execution loop with dynamic tool selection:
  - `searchDocument`: Deep vector similarity queries.
  - `generateSummary`: Structured document summaries and key points.
  - `generateQuiz`: Multiple-choice quizzes with answers and explanations.
* **Prompt Injection Defenses**: XML trust boundary isolation (`<document_context>`), explicit refusal to execute document commands, server-side parameter clamping, and source citation hallucination filtering.
* **Token & Cost Monitoring**: Automatic calculation of input/output tokens, execution latency (ms), and estimated cost ($) recorded in PostgreSQL `AIUsage` table.
* **LLM Evaluation Framework**: Automated evaluation suite (`backend/evals/evaluate.ts`, `backend/evals/questions.json`) testing factual recall, conceptual understanding, and comparison metrics.

### 3.4 Databases & Persistence
* **PostgreSQL (Prisma ORM)**:
  - Strongly-typed relational schema for `User`, `Document`, and `AIUsage` models.
  - Primary Keys (UUID) and Foreign Key relations (`User 1 ──< Document`, `User 1 ──< AIUsage`, `Document 1 ──< AIUsage`) with cascade deletion.
  - Relational SQL JOINs via Prisma `include` to combine document metadata with user owner emails (`GET /api/admin/documents`).
  - Compound indexes on `userId`, `createdAt`, and `documentId`.
* **MongoDB Atlas (Mongoose)**:
  - `ChatSession` model demonstrating Referencing (`userId`, `documentId` referencing PostgreSQL UUIDs) vs Embedding (`messages: [messageSchema]` subdocument array).
  - MongoDB Aggregation Pipeline (`$match` $\rightarrow$ `$group` $\rightarrow$ `$sort`) for admin conversation statistics (`GET /api/admin/chat-stats`).
  - Compound query indexing (`{ userId: 1, documentId: 1 }` and `{ updatedAt: -1 }`).

### 3.5 Infrastructure, Caching & Real-Time
* **Redis Caching**: Cache-Aside implementation for public statistics and document metadata with automatic cache invalidation on upload/delete.
* **Redis Rate Limiting**: Tiered sliding-window rate limiters for authentication (10 req/15m), AI endpoints (20 req/15m), and general API (100 req/15m) returning `429 Too Many Requests` and `Retry-After` headers.
* **WebSocket Document Processing Tracker**: Real-time progress updates via Socket.IO (`uploading` $\rightarrow$ `extracting` $\rightarrow$ `embedding` $\rightarrow$ `ready`) isolated to private user rooms (`user:${userId}`).
* **Payment Gateway (Razorpay Test Mode)**: Server-side order creation (`POST /api/payments/create-order`) and cryptographic HMAC SHA-256 signature verification (`POST /api/payments/verify`) before upgrading users to `PRO`.
* **Automated Cron Jobs**: Scheduled cleanup of stale usage records older than 90 days (`node-cron`).
* **Containerization**: Multi-stage Dockerfiles for Backend and Frontend with complete 6-service orchestration in `docker-compose.yml`.

### 3.6 Frontend Architecture (Next.js 16 + React 19)
* **Controlled Form Inputs**: Synchronous React `useState` state binding on login and register forms.
* **Server-Side Rendering (SSR)**: Dynamic React Server Component at `/stats` (`force-dynamic`) fetching platform statistics on the server before HTML delivery.
* **Responsive Layout**: Mobile-first Tailwind CSS responsive styling (`sm:`, `md:`, `lg:`) preventing horizontal overflow on mobile, tablet, and desktop viewports.
* **Client-Side Routing & State**: Next.js App Router navigation (`useRouter`, `useParams`) and async API hooks (`useEffect`, `useState`).

---

## 4. Non-Functional Requirements (NFR)

| Category | Requirement Specification | Implemented Evidence |
|---|---|---|
| **Latency** | Sub-500ms initial token response time for streaming RAG | Verified via Groq LLaMA 3.3 70B SSE stream |
| **Throughput & Abuse** | Prevent API flooding and credential attacks | Redis sliding-window rate limiters with 429 status |
| **Security** | Zero raw secrets in code; constant-time crypto signatures; strict trust boundaries | Verified via `prompt-injection.test.ts` and `payment.test.ts` |
| **Modularity** | Decoupled client-server and multi-database persistence | PostgreSQL + MongoDB + Redis + ChromaDB isolation |
| **Portability** | Run locally with zero global dependency pollution | Multi-stage Dockerfiles and `docker-compose.yml` |
| **Documentation** | Interactive OpenAPI specification and architectural guides | Swagger UI at `/api-docs` and `docs/*.md` |
