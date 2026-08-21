# DocuMind AI

An enterprise-grade, multi-agent AI document intelligence platform that transforms unstructured PDFs into interactive, semantically searchable knowledge bases using Retrieval-Augmented Generation (RAG), autonomous multi-step agents, and real-time streaming interfaces.

---

## Overview

DocuMind AI is a full-stack AI Document Intelligence and Autonomous Analysis application. Users can upload multi-page PDF documents, perform vector similarity retrieval, stream responses using state-of-the-art LLMs (Groq LLaMA 3.3 70B), interact with autonomous multi-step agents, and monitor execution cost, tokens, and latency in real time.

---

## Problem

Modern academic, legal, and enterprise teams deal with voluminous, unstructured PDF documents. Traditional keyword searches fail to comprehend semantic context, and naive LLM applications suffer from hallucinations, lack of verifiable source citations, severe context-window constraints, and vulnerability to indirect prompt injections.

---

## Solution

DocuMind AI solves this with an end-to-end, secure document intelligence pipeline:
* **High-Precision Vector Retrieval**: Recursive text chunking with 2048-dimensional NVIDIA Nemotron-3 embeddings stored in ChromaDB.
* **Verifiable RAG & Streaming**: Sub-second token streaming with verified chunk-level citations and source hallucination filters.
* **Autonomous Multi-Step Agents**: Goal-oriented agent that reasons iteratively, invokes validated tools (`searchDocument`, `generateSummary`, `generateQuiz`), and returns structured responses.
* **Polyglot Persistence**: Combines PostgreSQL (authoritative relational data), MongoDB Atlas (chat history), Redis (caching & rate limiting), and ChromaDB (vectors).
* **Strict Security Boundaries**: XML data isolation (`<document_context>`), server-side permission checks, cryptographic test payments, and zero secrets in LLM prompts.

---

## Key Features

* **Conversational RAG**: Semantic similarity search in ChromaDB paired with Groq LLaMA 3.3 70B reasoning.
* **Real-Time Token Streaming**: Server-Sent Events (SSE) streaming delivering responsive first-token latency.
* **Autonomous Multi-Step Agent**: Function-calling agent loop with dynamic tool execution.
* **Live Ingestion Tracker**: Socket.IO WebSockets providing real-time visual progress throughout multi-stage PDF ingestion.
* **Enterprise Auth & RBAC**: JWT authentication with `bcrypt` password hashing and Role-Based Access Control (`USER` vs `ADMIN`).
* **Relational SQL JOINs**: Dynamic admin catalog querying documents with user owner emails.
* **MongoDB Aggregations**: Multi-stage `$match` $\rightarrow$ `$group` $\rightarrow$ `$sort` pipeline for conversation analytics.
* **Redis Caching & Rate Limiting**: Multi-tier sliding-window rate limiters and Cache-Aside caching.
* **Payment Gateway (Razorpay Test Mode)**: Server-side order creation and cryptographic HMAC SHA-256 signature verification.
* **Server-Side Rendering (SSR)**: Dynamic React Server Component at `/stats` for platform metrics.

---

## Architecture

```
                    ┌───────────────────┐
                    │     Next.js       │
                    │     Frontend      │
                    └─────────┬─────────┘
                              │
                    REST / SSE / WebSocket
                              │
                    ┌─────────▼─────────┐
                    │ Express / Node.js │
                    │     Backend       │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼────────────────────┐
          │                   │                    │
          ▼                   ▼                    ▼
     PostgreSQL           MongoDB               Redis
      + Prisma           + Mongoose          Cache/Rate Limit
          │                   │                    │
          ▼                   ▼                    │
      Documents          ChatSessions              │
      Users              Messages                  │
      AIUsage                                      │
          │
          ├──────────────► ChromaDB (Vector Engine)
          │                   │
          ▼                   ▼
       AI Services ◄──── RAG Pipeline
          │
          ├── Embeddings → OpenRouter (Nemotron-3 2048d)
          ├── LLM → Groq Cloud (LLaMA 3.3 70B)
          └── Agent → Multi-Step Function Calling
```

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Socket.IO Client |
| **Backend** | Node.js 20+, Express.js, TypeScript, Zod, Supertest, Jest |
| **Databases** | PostgreSQL 15 (Prisma ORM), MongoDB Atlas (Mongoose), Redis 7, ChromaDB |
| **AI & LLM** | Groq Cloud (`llama-3.3-70b-versatile`), OpenRouter (`nvidia/nemotron-3-embed-1b:free`) |
| **Real-Time** | Socket.IO WebSockets, Server-Sent Events (SSE) |
| **Payments** | Razorpay Node.js SDK (Test Mode) |
| **DevOps** | Docker, Docker Compose, Multi-stage builds |

---

## AI Architecture

* **Embeddings**: Documents are parsed with `pdf-parse`, chunked recursively (~500 tokens with 10% overlap), and embedded into 2048-dimensional vectors using NVIDIA Nemotron-3.
* **RAG Inference**: User questions are embedded and matched using cosine distance in ChromaDB. Retrieved chunks are injected into Groq LLaMA 3.3 70B for generation.
* **Autonomous Agent**: Evaluates user prompts, selects tools dynamically (`searchDocument`, `generateSummary`, `generateQuiz`), and iterates with a safety boundary limit of `MAX_AGENT_STEPS = 5`.
* **Evaluation Framework**: Automated evaluation suite (`backend/evals/`) measuring factual recall, concept definitions, and comparative metrics against curated benchmark questions.

---

## Security

* **Prompt Injection Mitigations**: Document chunks wrapped in `<document_context>` XML tags with explicit instructions never to execute commands contained within document text.
* **Cryptographic Authorization**: Document access, payments, and admin endpoints are validated exclusively via verified JWT payloads (`req.user.id`, `req.user.role`).
* **Tool Argument Clamping**: Quiz question counts clamped between 1 and 10; query inputs bounded to 4000 characters.
* **Citation Hallucination Filter**: Server validates cited chunk IDs against genuine ChromaDB retrieved vectors before returning them.

---

## Database Architecture

* **PostgreSQL (Prisma ORM)**: Stores authoritative relational entities (`User`, `Document`, `AIUsage`). Foreign keys enforce referential integrity with cascade deletion. Demonstrates SQL JOINs and 3NF normalization.
* **MongoDB Atlas (Mongoose)**: Stores conversational threads (`ChatSession`). Demonstrates Referencing (UUIDs pointing to PostgreSQL) vs Embedding (`messages` subdocument array) and aggregation pipelines (`$match`, `$group`, `$sort`).
* **ChromaDB**: Manages high-dimensional vector embeddings with cosine similarity distance metrics.

---

## Real-Time Processing

* **Socket.IO Real-Time Tracker**: Clients receive live visual updates during ingestion (`uploading` $\rightarrow$ `extracting` $\rightarrow$ `embedding` $\rightarrow$ `ready`).
* **Private User Rooms**: WebSocket connections are authenticated via JWT during handshake and joined to isolated `user:${userId}` rooms.

---

## Payment Integration

* **Razorpay Test Mode**: Full checkout integration enabling users to upgrade from `FREE` to `PRO` plan.
* **HMAC SHA-256 Verification**: Payments require constant-time digital signature validation against `RAZORPAY_KEY_SECRET` before updating subscription status in PostgreSQL.

---

## Caching & Rate Limiting

* **Redis Caching**: Cache-Aside implementation caching public platform metrics (`/api/public/stats`) and document metadata with automatic cache invalidation on upload/delete.
* **Redis Rate Limiting**: Multi-tier sliding-window limiters protecting Auth (10 req/15m), AI endpoints (20 req/15m), and General routes (100 req/15m).

---

## Docker

DocuMind AI is containerized with multi-stage production Dockerfiles:
* `backend/Dockerfile`: Multi-stage build compiling TypeScript into minimal Alpine Linux runner.
* `frontend/Dockerfile`: Multi-stage build producing optimized Next.js standalone runner.
* `docker-compose.yml`: Orchestrates 6 services (`backend`, `frontend`, `postgres`, `chromadb`, `redis`, `mongodb`).

---

## API Documentation

* **Interactive Swagger UI**: `http://localhost:5000/api-docs`
* **Raw OpenAPI 3.0 Specification**: `http://localhost:5000/api-docs/swagger.json`
* **Complete Endpoint Reference**: [docs/api.md](docs/api.md)

---

## Project Structure

```
documind-ai/
├── backend/                # Express.js REST API & AI Service Engine
│   ├── src/                # Controllers, services, agents, tools, middleware
│   ├── prisma/             # PostgreSQL schema and migrations
│   ├── evals/              # Automated LLM evaluation benchmark suite
│   ├── tests/              # 17 automated test suites (93+ unit/integration tests)
│   └── Dockerfile          # Multi-stage production backend container
├── frontend/               # Next.js 16 Web Application
│   ├── src/app/            # App Router pages (Dashboard, Documents, Login, Register, Stats)
│   └── Dockerfile          # Multi-stage production frontend container
├── docs/                   # In-depth technical architecture documentation
│   ├── api.md              # Complete REST & WebSocket API specification
│   ├── caching.md          # Redis Cache-Aside & invalidation architecture
│   ├── docker.md           # Docker containerization & orchestration guide
│   ├── evaluation.md       # LLM evaluation suite & benchmark dataset
│   ├── javascript-concepts.md # Event Loop, Hoisting, Closures & Async guide
│   ├── mongodb.md          # Referencing, Embedding & Aggregation guide
│   ├── normalization.md    # Relational normalization (1NF, 2NF, 3NF) guide
│   ├── payment.md          # Razorpay payment gateway integration guide
│   ├── prompt-injection.md # Prompt injection awareness & defense guide
│   ├── rate-limiting.md    # Multi-tier Redis rate limiting architecture
│   ├── rubric-mapping.md   # College viva rubric traceability matrix
│   ├── sql.md              # PostgreSQL schema & SQL JOIN guide
│   ├── ssr.md              # Server-Side Rendering (SSR) architecture
│   └── websocket.md        # Socket.IO real-time communication guide
└── docker-compose.yml      # Multi-container orchestration stack
```

---

## Local Setup

### 1. Prerequisites
* Node.js 20+
* Docker & Docker Compose
* PostgreSQL, Redis, MongoDB Atlas, ChromaDB

### 2. Environment Configuration
Copy environment templates:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 3. Install & Start Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 4. Install & Start Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Backend server port (Default: `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB Atlas / local connection string |
| `REDIS_URL` | Redis server connection string |
| `CHROMADB_URL` | ChromaDB vector database URL |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `GROQ_API_KEY` | Groq Cloud API key for LLaMA 3.3 70B |
| `OPENROUTER_API_KEY` | OpenRouter API key for Nemotron embeddings |
| `RAZORPAY_KEY_ID` | Razorpay Test Mode Key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Mode Key Secret |
| `NEXT_PUBLIC_API_URL` | Frontend API URL (Default: `http://localhost:5000`) |

---

## Testing

```bash
# Run backend test suite (17 suites, 93+ tests)
cd backend
npm test

# Run LLM benchmark evaluation
npm run evaluate <documentId> <userId>
```

---

## Deployment

Deploy using Docker Compose:
```bash
docker compose up --build -d
```

---

## Future Improvements

* Multi-modal document ingestion (OCR for scanned images and handwriting).
* Distributed task queue (BullMQ + Redis) for asynchronous high-volume batch embedding ingestion.
* Fine-grained hybrid search combining dense semantic vectors with sparse BM25 keyword search.
