# DocuMind AI — Rate Limiting Architecture & Defense

This document details the multi-tiered, Redis-backed rate limiting architecture implemented in DocuMind AI, explaining identity strategies, error formats, and viva defense concepts.

---

## 1. Rate Limiting Strategy & Architecture

DocuMind AI uses centralized **Redis atomic counters** to enforce rate limits across single and multi-instance backend deployments.

```mermaid
graph TD
    Client[Incoming Client Request] --> Gateway[Express Middleware]
    Gateway --> CheckRedis{Is Redis Connected?}
    CheckRedis -->|No (Redis Outage)| AllowFailOpen[Degrade Gracefully & Allow Request]
    CheckRedis -->|Yes| ResolveIdentity[Resolve Client Identity<br/>JWT userId vs Client IP]
    ResolveIdentity --> IncrKey["INCR ratelimit:{type}:{identity}"]
    IncrKey --> CheckFirst{"First Request?<br/>(currentCount === 1)"}
    CheckFirst -->|Yes| SetTTL["EXPIRE key windowSeconds"]
    CheckFirst -->|No| CompareLimit{"currentCount > limit?"}
    SetTTL --> CompareLimit
    CompareLimit -->|No| AttachHeaders["Set X-RateLimit Headers<br/>& Call next()"]
    CompareLimit -->|Yes| Block["Set Retry-After Header<br/>& Return HTTP 429 RATE_LIMITED"]
```

---

## 2. Endpoint Limits Matrix

| Category | Targeted Endpoints | Limit Window | Identity Strategy | Redis Key Format |
|---|---|---|---|---|
| **Auth** | `POST /api/auth/register`<br/>`POST /api/auth/login` | 10 reqs / 15 mins (900s) | Client IP Address | `ratelimit:auth:{ip}` |
| **AI Operations** | `POST /api/ai/chat`<br/>`POST /api/ai/chat/stream`<br/>`POST /api/ai/agent` | 20 reqs / 15 mins (900s) | Authenticated `req.user.id` (from JWT) | `ratelimit:ai:{userId}` |
| **General API** | All `/api/*` endpoints | 100 reqs / 15 mins (900s) | Client IP Address | `ratelimit:general:{ip}` |

---

## 3. Rate Limit Headers & Error Envelope

When rate limits are active, responses include standardized rate limit headers:
* `X-RateLimit-Limit`: Maximum requests permitted within the sliding window.
* `X-RateLimit-Remaining`: Remaining request allowance before throttling.
* `X-RateLimit-Reset`: Unix timestamp when the current window resets.

### HTTP 429 Response Envelope
When exceeded, the server returns HTTP 429 with the `Retry-After: <seconds>` header and a uniform JSON body:

```json
{
  "success": false,
  "message": "AI request rate limit exceeded. Please try again later.",
  "error": {
    "code": "RATE_LIMITED",
    "message": "AI request rate limit exceeded. Please try again later.",
    "details": [
      {
        "message": "Rate limit exceeded. Try again in 450 seconds.",
        "retryAfter": 450
      }
    ]
  }
}
```

---

## 4. Resilience & Fail-Open Behavior

Redis is treated as a high-performance optimization and protection layer rather than a single point of failure:
* If the Redis server is unreachable (`redisClient.isOpen === false`), the middleware logs a warning and immediately calls `next()`.
* If a Redis command throws a network error during execution, the exception is caught safely, allowing the legitimate user request to reach the controller instead of throwing a 500 error.

---

## 5. Viva Defense Q&A

### Q1: Why do we use Redis for rate limiting instead of in-memory JavaScript variables?
> **Answer**: In-memory JavaScript variables (e.g. `Map` or objects) only exist within a single Node.js process. If the application is scaled horizontally across multiple instances or worker threads behind a load balancer (PM2, Docker, or Kubernetes), each instance would maintain its own isolated counters, allowing attackers to multiply their request volume. Redis provides a fast, shared, atomic counter (`INCR`) across all instances.

### Q2: Why is the AI rate limiter tied to `req.user.id` rather than IP?
> **Answer**: AI endpoints (RAG streaming and multi-step agents) incur real computational and API costs (Groq tokens and OpenRouter embeddings). Relying on IP addresses is unreliable because multiple users on a corporate or university network share the same public NAT IP. By verifying the signed JWT and keying on `req.user.id`, each account is individually rate-limited regardless of their network connection.
