# Real-Time WebSocket Communication (Socket.IO)

## 1. Overview & Motivation

DocuMind AI uses **Socket.IO (WebSocket with fallback)** for **Real-Time Document Processing Status Updates**.

### Why WebSocket over HTTP Polling?
* **Traditional HTTP Polling**: The client must continuously send `GET /api/documents/:id` requests every 1–2 seconds to check if extraction or embedding has completed. This causes unnecessary network overhead, high database load, and latency in UI updates.
* **WebSocket / Socket.IO**: A single persistent, bidirectional TCP connection is established after JWT authentication. When the backend completes an extraction or embedding stage, it instantly pushes the update to the client with minimal overhead.

---

## 2. Architecture & Room Isolation

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER CLIENT                                   |
|                                                                                   |
|  1. Handshake with JWT -> socket.io-client auth: { token: "..." }                 |
+----------------------------------------+------------------------------------------+
                                         |
                                         | Persistent WebSocket Connection
                                         v
+-----------------------------------------------------------------------------------+
|                              EXPRESS / SOCKET.IO SERVER                           |
|                                                                                   |
|  2. Middleware: jwt.verify(token, secret)                                         |
|  3. socket.join("user:" + decodedUserId)                                          |
|                                                                                   |
|  [Document Upload Pipeline]                                                       |
|  +-----------------------------------------------------------------------------+  |
|  | Stage 1: Upload Received       -> emit('document:status', { stage: 'upload' }) |
|  | Stage 2: Text Extraction       -> emit('document:status', { stage: 'extract'}) |
|  | Stage 3: Chunking              -> emit('document:status', { stage: 'chunk' })  |
|  | Stage 4: Nemotron Embeddings   -> emit('document:status', { stage: 'embed' })  |
|  | Stage 5: ChromaDB Indexing     -> emit('document:status', { stage: 'store' })  |
|  | Stage 6: Completed (READY)     -> emit('document:status', { stage: 'done' })   |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

### Multi-Tenant Security & Room Strategy
* Every authenticated user joins a private Socket.IO room named `user:${userId}`.
* When document processing events are emitted, the server targets only the specific user's room:
  ```typescript
  io.to(`user:${userId}`).emit('document:status', payload);
  ```
* This prevents any user from snooping on or receiving document events belonging to another user.

---

## 3. Real-Time Event Lifecycle

| Event Name | Stage | Progress | Description |
| :--- | :--- | :--- | :--- |
| `document:status` | `uploading` | 15% | File uploaded and saved to disk. |
| `document:status` | `extracting` | 35% | Extracting raw text from PDF buffer. |
| `document:status` | `chunking` | 55% | Splitting text into token chunks with overlap. |
| `document:status` | `embedding` | 75% | Generating 2048-dim vector embeddings via OpenRouter Nemotron-3. |
| `document:status` | `storing_vectors` | 90% | Indexing chunk vectors into ChromaDB collections. |
| `document:status` | `completed` | 100% | Status marked as `READY`; client auto-refreshes document table. |
| `document:status` | `error` | - | Processing failed; status marked as `FAILED`. |

---

## 4. Viva Questions & Answers

**Q1: How does Socket.IO authenticate connections?**
> *Answer*: Socket.IO uses connection middleware (`io.use`). During the initial WebSocket handshake, the client passes its JWT token in `socket.handshake.auth.token`. The server validates the token using `jwt.verify()`. If the token is missing or invalid, the connection is rejected before any data is exchanged.

**Q2: How do you ensure user A cannot listen to user B's document progress?**
> *Answer*: We use room-based isolation. Upon connection, each socket automatically joins `user:${userId}` derived from the verified JWT. All status emissions are directed strictly to `io.to('user:' + document.userId)`, guaranteeing multi-tenant data isolation.

**Q3: What happens if the WebSocket connection drops during processing?**
> *Answer*: The client has automatic reconnection configured (`reconnection: true`, `reconnectionAttempts: 5`). Furthermore, the document status is always persisted in PostgreSQL (`status: 'READY'`), so even if the socket disconnects, refreshing the page or fetching `/api/documents` retrieves the latest state from the database.
