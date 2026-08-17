# DocuMind AI

DocuMind AI is a full-stack AI document assistant that processes PDF documents into chunks and embeddings, allowing users to ask questions using RAG and an LLM agent. 

## Current Architecture (Phase 1)
- **Frontend**: Next.js (App Router) + Tailwind CSS + TypeScript.
- **Backend**: Express + TypeScript + Node.js.
- **Infrastructure**: Basic Docker Compose setup prepared for future databases (PostgreSQL, MongoDB, Redis).

## Setup Instructions

### Environment Variables
1. Copy `.env.example` to `.env` in the root folder (or within frontend/backend as necessary in future phases).
2. Configure the variables according to your local setup.

### Backend Setup
1. `cd backend`
2. `npm install`
3. `npm run dev`
The backend will run on `http://localhost:5000`.

**Health Endpoint**: `GET /api/health`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. `npm run dev`
The frontend will run on `http://localhost:3000`.

## Future Phases
Upcoming phases will integrate ChromaDB, PostgreSQL, MongoDB, Redis, WebSockets, payments, and an LLM agent.
