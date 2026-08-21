# Server-Side Rendering (SSR) in DocuMind AI

This document details the Server-Side Rendering (SSR) architecture, React Server Components implementation, and performance benefits in DocuMind AI.

---

## 1. Client-Side Rendering (CSR) vs Server-Side Rendering (SSR)

```mermaid
sequenceDiagram
    autonumber
    actor Browser as User Browser
    participant Server as Next.js Server
    participant Backend as Express Backend API
    participant DB as PostgreSQL Database

    Note over Browser,DB: Client-Side Rendering (e.g. Dashboard)
    Browser->>Server: GET /dashboard
    Server-->>Browser: Blank HTML skeleton + JavaScript bundle
    Browser->>Browser: Execute React & check localStorage JWT
    Browser->>Backend: GET /api/documents (Client Fetch)
    Backend-->>Browser: JSON Data
    Browser->>Browser: Re-render UI with data (Layout Shift)

    Note over Browser,DB: Server-Side Rendering (e.g. /stats)
    Browser->>Server: GET /stats
    Server->>Backend: GET /api/public/stats (Server Fetch)
    Backend->>DB: COUNT(users), COUNT(documents), COUNT(aiUsages)
    DB-->>Backend: Aggregate totals
    Backend-->>Server: JSON Stats payload
    Server->>Server: Render complete HTML with populated numbers
    Server-->>Browser: Fully populated HTML ready to display (Instant FCP)
```

---

## 2. Server Component Implementation ([frontend/src/app/stats/page.tsx](file:///c:/Projects/documind/documind-ai/frontend/src/app/stats/page.tsx))

The public statistics page is implemented as an asynchronous React Server Component:

1. **No `'use client'` Directive**: Instructs Next.js Turbopack to execute this component exclusively on the Node.js server.
2. **`export const dynamic = 'force-dynamic'`**: Bypasses static caching, ensuring fresh relational database counts are retrieved on each request.
3. **No Browser API Dependencies**: Does not use `window`, `document`, `localStorage`, or `useEffect`, ensuring zero hydration mismatches.

```tsx
export const dynamic = 'force-dynamic';

async function fetchStats() {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const res = await fetch(`${apiUrl}/api/public/stats`, { cache: 'no-store' });
  return res.ok ? res.json() : null;
}

export default async function PublicStatsPage() {
  const statsResponse = await fetchStats();
  const stats = statsResponse?.data || { totalUsers: 0, totalDocuments: 0, totalAIUsages: 0 };
  
  return (
    <div>
      <h1>DocuMind AI Platform Stats</h1>
      <p>Users: {stats.totalUsers}</p>
      <p>Documents: {stats.totalDocuments}</p>
    </div>
  );
}
```

---

## 3. Benefits of SSR in DocuMind AI

* **Search Engine Optimization (SEO)**: Search engine web crawlers receive a complete HTML document containing live platform statistics without needing to execute client-side JavaScript.
* **Fast First Contentful Paint (FCP)**: The user sees meaningful data immediately upon receiving the initial HTTP response without waiting for client-side API roundtrips.
* **Tenant Security Isolation**: Because Server Components run in a trusted server environment, public metrics can be rendered without exposing internal database schemas to the browser.
