# DocuMind AI

DocuMind AI is a full-stack AI document assistant that processes PDF documents into chunks and embeddings, allowing users to ask questions using RAG and an LLM agent. 

## Current Architecture (Phase 1)
- **Frontend**: Next.js (App Router) + Tailwind CSS + TypeScript.
- **Backend**: Express + TypeScript + Node.js.
- **Infrastructure**: Basic Docker Compose setup prepared for future databases (PostgreSQL, MongoDB, Redis).

## Setup Instructions

### Environment Variables
1. Copy `.env.example` to `.env` in the root folder (or within frontend/backend as necessary).
2. Configure the variables according to your local setup. Ensure `MONGODB_URI` and `DATABASE_URL` in `backend/.env` point to your local Docker containers if using the provided `docker-compose.yml`.

### Starting the Infrastructure
1. Make sure Docker is running on your machine.
2. In the project root directory, start the required database services:
   ```bash
   docker-compose up -d
   ```
   This will start PostgreSQL, MongoDB, Redis, and ChromaDB.

### Backend Setup
1. Open a new terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Push the Prisma schema to the database (this syncs the schema and generates the Prisma client):
   ```bash
   npx prisma db push
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
The backend will run on `http://localhost:5000`.

**Health Endpoint**: `GET /api/health`

### Frontend Setup
1. Open another terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
The frontend will run on `http://localhost:3000`.

## Future Phases
Upcoming phases will integrate ChromaDB, PostgreSQL, MongoDB, Redis, WebSockets, payments, and an LLM agent.
