# DocuMind AI

DocuMind AI is an enterprise-grade, multi-agent AI document intelligence platform that transforms static PDFs into interactive, semantically searchable knowledge bases using Retrieval-Augmented Generation (RAG), autonomous multi-step agents, and real-time streaming interfaces.

---

## 🌟 Key Features

* **RAG & Semantic Retrieval**: Document parsing, recursive chunking, 2048-dimensional Nemotron embeddings via OpenRouter, and ChromaDB vector similarity search.
* **Real-time SSE Token Streaming**: Server-Sent Events (SSE) token streaming for responsive chat responses.
* **Autonomous Multi-Step Agent**: Function-calling agent that autonomously plans, decomposes complex queries, runs tools (`generateSummary`, `generateQuiz`, `searchDocument`), and synthesizes structured answers.
* **Real-time Ingestion Tracking**: Socket.IO authenticated WebSockets providing live visual progress throughout multi-stage PDF ingestion.
* **Enterprise Auth & RBAC**: JWT authentication with `bcrypt` password hashing and Role-Based Access Control (`USER` vs `ADMIN`).
* **Polyglot Database Architecture**:
  * **PostgreSQL + Prisma ORM**: Structured user models, documents, and token/cost tracking tables.
  * **MongoDB + Mongoose**: Document chat session histories and subdocument message threads.
  * **ChromaDB**: High-performance vector embeddings storage.
  * **Redis**: Centralized Cache-Aside caching, auto-invalidation, and atomic multi-tier rate limiting.
* **Payment Gateway Integration**: Razorpay Test Mode integration with cryptographic HMAC SHA-256 digital signature verification.
* **AI Abuse & Safety Defenses**: Prompt injection mitigations, 4000-character input ceilings, and strict agent iteration boundaries (`MAX_AGENT_STEPS = 5`).
* **OpenAPI 3.0 & Swagger UI**: Interactive API documentation at `/api-docs`.
* **Automated Background Jobs**: Node-cron jobs for periodic usage metric aggregation and cleanup.
* **Server-Side Rendering (SSR)**: Next.js Server Components for lightning-fast, SEO-optimized public platform statistics.

---

## 🏗️ Architecture

```
Frontend (Next.js / Tailwind CSS / Socket.IO Client)
       │
       ▼  HTTP / REST / SSE / WebSocket
Backend (Express / TypeScript / Node.js)
       ├── Authentication & RBAC (JWT + bcrypt)
       ├── Rate Limiting & Caching (Redis)
       ├── Relational Data & Cost Tracking (PostgreSQL + Prisma)
       ├── Chat History & Sessions (MongoDB + Mongoose)
       ├── Vector Similarity Engine (ChromaDB)
       ├── LLM & Agents (Groq LLaMA 3.3 70B)
       ├── Embeddings (OpenRouter Nemotron-3 2048d)
       └── Payments (Razorpay Test Mode)
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Socket.IO Client |
| **Backend** | Node.js, Express, TypeScript, Zod, Supertest, Jest |
| **Databases** | PostgreSQL, MongoDB Atlas, Redis 7, ChromaDB |
| **AI / LLM** | Groq Cloud (`llama-3.3-70b-versatile`), OpenRouter (`nvidia/nemotron-3-embed-1b:free`) |
| **Real-time** | Socket.IO WebSockets, Server-Sent Events (SSE) |
| **Payments** | Razorpay SDK (Test Mode) |
| **DevOps** | Docker Compose, Multi-stage builds, Git |

---

## 🚀 Running Locally

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* [Docker & Docker Compose](https://www.docker.com/)

### 2. Clone & Setup Environment
```bash
git clone https://github.com/Digvijay-999/Documind.git
cd Documind

# Copy environment variables
cp .env.example .env
cp backend/.env.example backend/.env
```

Configure your API keys in `backend/.env`:
* `GROQ_API_KEY`: Groq Cloud API key
* `OPENROUTER_API_KEY`: OpenRouter API key
* `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`: Razorpay Test Mode keys
* `JWT_SECRET`: Random 32+ character secret string

### 3. Start Database Services via Docker
```bash
docker compose up -d
```
This initializes PostgreSQL (5432), Redis (6379), ChromaDB (8000), and MongoDB (27017).

### 4. Setup & Start Backend
```bash
cd backend
npm install
npx prisma db push
npm run dev
```
Backend runs at `http://localhost:5000`.  
Swagger UI documentation is available at `http://localhost:5000/api-docs`.

### 5. Setup & Start Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Frontend application runs at `http://localhost:3000`.

---

## 🧪 Testing & Verification

Run the full automated test suite:
```bash
cd backend
npm test
```
* **Test Coverage**: 16 test suites, 87 unit and integration tests passing.

---

## 📖 Documentation
* [Architecture & High-Level Design (HLD)](HLD.md)
* [Low-Level Design (LLD)](LLD.md)
* [Product Requirements Document (PRD)](PRD.md)
* [API & Swagger Documentation](docs/api.md)
* [Rate Limiting Architecture](docs/rate-limiting.md)
* [Redis Caching Architecture](docs/caching.md)
* [Database Normalization Guide](docs/normalization.md)
* [Payment Integration Guide](docs/payment.md)
* [WebSocket Real-Time Guide](docs/websocket.md)
