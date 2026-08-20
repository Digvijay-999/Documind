# High-Level Design (HLD) — DocuMind AI

**Project Name**: DocuMind AI  
**Architecture Paradigm**: Decoupled Client-Server with Polyglot Persistence, Event-Driven WebSockets & Streaming AI  
**Target Platform**: Linux/Docker / Node.js 20+ Runtime  

---

## 1. System Architecture Overview

DocuMind AI is architected as a modular, decoupled full-stack platform. The presentation layer is built on **Next.js (React 19, Turbopack)**, communicating via REST, SSE, and WebSockets to an **Express.js (TypeScript)** backend engine.

```mermaid
graph TB
    subgraph ClientLayer["Presentation Layer (Client)"]
        UI["Next.js 16 Web App<br/>(Tailwind CSS + Lucide Icons)"]
        SocketClient["Socket.IO Client<br/>(Real-Time Tracker)"]
        RazorpayModal["Razorpay Checkout SDK<br/>(Test Mode)"]
    end

    subgraph GatewayLayer["API & Middleware Layer"]
        Express["Express.js Server (Port 5000)"]
        Swagger["OpenAPI 3.0 / Swagger UI<br/>(/api-docs)"]
        AuthMid["JWT Auth Middleware<br/>(HMAC SHA-256)"]
        RateMid["Redis Rate Limiter<br/>(Sliding Window)"]
        ErrMid["Centralized Error Handler"]
    end

    subgraph ServiceLayer["Core Domain Services"]
        DocController["Document Ingestion Pipeline"]
        RAGService["RAG Retrieval & Streaming Engine"]
        AgentEngine["Multi-Step Autonomous Agent"]
        PaymentService["Razorpay Payment Service"]
        SocketService["Socket.IO WebSocket Manager"]
        CronService["Automated Usage Cleanup Cron"]
    end

    subgraph PolyglotPersistence["Polyglot Persistence Layer"]
        Postgres[(PostgreSQL 16 + Prisma)<br/>Users, Docs, AIUsage, Plans]
        MongoDB[(MongoDB Atlas + Mongoose)<br/>ChatSessions & Messages]
        Redis[(Redis Cache & Limiter)<br/>Key-Value Store]
        Chroma[(ChromaDB Vector DB)<br/>Cosine Distance Index]
    end

    subgraph ExternalAI["External AI & Payment Providers"]
        Groq["Groq Cloud API<br/>(LLaMA 3.3 70B Versatile)"]
        OpenRouter["OpenRouter API<br/>(Nemotron-3 Embed 1B - 2048d)"]
        RazorpayAPI["Razorpay API<br/>(Orders & Webhooks)"]
    end

    %% Connections
    UI -->|REST APIs| Express
    UI -->|Server-Sent Events| RAGService
    SocketClient <-->|WebSocket Events| SocketService
    RazorpayModal <-->|Checkout Flow| PaymentService

    Express --> Swagger
    Express --> AuthMid
    AuthMid --> RateMid
    RateMid --> ErrMid

    ErrMid --> DocController
    ErrMid --> RAGService
    ErrMid --> AgentEngine
    ErrMid --> PaymentService

    DocController -->|Store Metadata| Postgres
    DocController -->|Index Vectors| Chroma
    DocController -->|Push Events| SocketService
    DocController -->|Embeddings| OpenRouter

    RAGService -->|Vector Query| Chroma
    RAGService -->|LLM Streaming| Groq
    RAGService -->|Record Usage| Postgres
    RAGService -->|Save History| MongoDB
    RAGService -->|Cache Answers| Redis

    AgentEngine -->|Tools Execution| Groq
    AgentEngine -->|Vector Search| Chroma
    AgentEngine -->|Save History| MongoDB

    PaymentService -->|Order Creation & Verify| RazorpayAPI
    PaymentService -->|Update Subscription| Postgres

    CronService -->|Prune Old Logs| Postgres
```

---

## 2. Polyglot Persistence Architecture

DocuMind AI uses a **specialized multi-database persistence model** to maximize throughput, data integrity, and operational efficiency:

```mermaid
classDiagram
    class PostgreSQL {
        +ACID Transactions
        +Relational Schemas
        +B-Tree Indexing
        -User Management
        -Document Metadata
        -Token Usage Logs
        -Subscription Status
    }
    class MongoDBAtlas {
        +Document Store
        +Flexible Schemas
        -ChatSession Collection
        -Chronological Messages Array
        -Conversation Metadata
    }
    class Redis {
        +In-Memory Key-Value
        +Sub-millisecond Latency
        -AI Answer Cache (TTL 10m)
        -Hourly Rate Limiting Counters
    }
    class ChromaDB {
        +High-Dimensional Vector Store
        +Cosine Similarity Index
        -2048-dim Nemotron Vectors
        -Chunk Metadata & Content
    }

    PostgreSQL --|> PolyglotStorage
    MongoDBAtlas --|> PolyglotStorage
    Redis --|> PolyglotStorage
    ChromaDB --|> PolyglotStorage
```

| Database | Primary Role | Key Queries / Operations | Why Chosen |
|---|---|---|---|
| **PostgreSQL 16** | Relational / ACID Master | User auth, doc metadata, usage analytics, joins | Strong consistency, foreign keys, transaction rollbacks |
| **MongoDB Atlas** | Document / Chat History | `ChatSession.findOneAndUpdate({ userId, docId })` | Dynamic message schemas, zero schema migrations for chats |
| **Redis** | In-Memory Cache & Limiter | `SETEX ai:answer:* 600`, `INCR ratelimit:*` | Sub-5ms response caching, atomic increments for rate-limiting |
| **ChromaDB** | Vector Database | Cosine distance similarity query on embeddings | Fast local embedding search, metadata filtering |

---

## 3. End-to-End Ingestion & Processing Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Frontend
    participant WS as Socket.IO Hub
    participant API as Express Document Route
    participant PDF as PDF Parser & Chunker
    participant OR as OpenRouter (Nemotron-3)
    participant VecDB as ChromaDB
    participant PG as PostgreSQL (Prisma)

    User->>Web: Select PDF & Click Upload
    Web->>WS: Connect WebSocket with JWT
    WS-->>Web: Authenticated & Joined user:userId Room
    Web->>API: POST /api/documents (multipart/form-data)
    API->>PG: INSERT Document (status: PROCESSING)
    API-->>Web: HTTP 201 Created (documentId)
    API->>WS: Emit status: 'uploading' (15%)
    WS-->>Web: Push stage event
    
    rect rgb(240, 248, 255)
        Note over API,VecDB: Background Ingestion Pipeline
        API->>WS: Emit status: 'extracting' (35%)
        API->>PDF: Parse binary buffer into raw text
        API->>WS: Emit status: 'chunking' (55%)
        API->>PDF: Split into 500-token chunks with 10% overlap
        API->>WS: Emit status: 'embedding' (75%)
        API->>OR: POST /api/v1/embeddings (Nemotron-3 1B)
        OR-->>API: Return 2048-dimensional float arrays
        API->>WS: Emit status: 'storing_vectors' (90%)
        API->>VecDB: Add embeddings, chunk text, and docId metadata
        API->>PG: UPDATE Document SET status = 'READY'
        API->>WS: Emit status: 'completed' (100%)
    end
    WS-->>Web: Real-time update: Document Ready
    Web->>Web: Re-fetch document list / enable chat
```

---

## 4. RAG Query & Token Streaming Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Next.js Chat UI
    participant API as Express AI Controller
    participant Redis as Redis Cache
    participant OR as OpenRouter Embedding
    participant Chroma as ChromaDB
    participant Groq as Groq Cloud (LLaMA 3.3 70B)
    participant Mongo as MongoDB
    participant PG as PostgreSQL

    User->>Web: Enter question: "What are the core findings?"
    Web->>API: POST /api/ai/chat/stream (SSE)
    API->>API: Verify JWT & Document Ownership
    API->>Redis: Check Cache: ai:answer:{userId}:{docId}:{hash}
    
    alt Cache Miss
        API->>OR: Generate query embedding (Nemotron-3)
        OR-->>API: 2048d Query Vector
        API->>Chroma: Query top-k nearest chunks (k=4)
        Chroma-->>API: Relevant chunks + Cosine similarity scores
        API->>API: Construct Anti-Injection System Prompt + Chunks Context
        API->>Groq: POST /chat/completions (stream=true)
        loop Token-by-Token Streaming
            Groq-->>API: Stream delta chunk
            API-->>Web: SSE data: {"text": "token"}
        end
        API->>Redis: SETEX cacheKey 600 JSON(result)
        API->>Mongo: Append user & assistant messages to ChatSession
        API->>PG: Record AIUsage (tokens, latency, cost)
        API-->>Web: SSE data: {"done": true, "sources": [...]}
    else Cache Hit
        API-->>Web: Return cached answer immediately
    end
```

---

## 5. Razorpay Cryptographic Payment Verification Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Web as Dashboard UI
    participant API as Payment Controller
    participant Razorpay as Razorpay Cloud
    participant PG as PostgreSQL

    User->>Web: Click "Upgrade to PRO (₹499)"
    Web->>API: POST /api/payments/create-order
    API->>Razorpay: orders.create({ amount: 49900, currency: "INR" })
    Razorpay-->>API: { id: "order_xyz", amount: 49900 }
    API-->>Web: Return orderId & razorpayKeyId
    Web->>Razorpay: Open Razorpay Checkout Modal
    User->>Razorpay: Complete Test Card Payment
    Razorpay-->>Web: Return payment_id, order_id, signature
    Web->>API: POST /api/payments/verify
    
    Note over API: Cryptographic Verification<br/>expectedSig = HMAC_SHA256(order_id + '|' + payment_id, SECRET)<br/>timingSafeEqual(expectedSig, receivedSig)
    
    alt Signature Valid
        API->>PG: UPDATE User SET subscriptionPlan='PRO', subscriptionStatus='ACTIVE'
        API-->>Web: HTTP 200 OK (User upgraded to PRO)
        Web->>Web: Flip UI to "PRO Active" Badge
    else Signature Invalid
        API-->>Web: HTTP 400 Bad Request (Invalid signature)
    end
```

---

## 6. Security & Defense in Depth

1. **Authentication**: Stateless JWT with HMAC SHA-256 tokens.
2. **Authorization**: Strict tenant isolation in DB queries (`where: { userId, id: documentId }`), returning HTTP 404 to prevent resource enumeration.
3. **Cryptographic Signatures**: Timing-safe HMAC SHA-256 validation for payments preventing side-channel timing attacks.
4. **Input Sanitization**: Strong Zod schema enforcement across all HTTP endpoints.
5. **AI Safety**: Multi-layer prompt injection filters preventing delimiter tampering, jailbreak keywords, and system prompt overrides.
6. **Error Masking**: Production errors masked to avoid leaking stack traces or credentials.
