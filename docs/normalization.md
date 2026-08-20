# Database Normalization in DocuMind AI

This document explains how the PostgreSQL schema in DocuMind AI implements standard database normalization principles.

## The Principles of Normalization

### 1NF (First Normal Form)
**Rule**: All attributes must be atomic (indivisible) and there should be no repeating groups.
**How we follow it**: 
In our `User`, `Document`, and `AIUsage` models, every field stores a single, atomic value. We do not store lists of documents as a comma-separated string inside the `User` table, nor do we store repeating AI usages inside the `Document` table.

### 2NF (Second Normal Form)
**Rule**: The table must be in 1NF, and all non-key attributes must depend on the whole primary key (no partial dependencies).
**How we follow it**: 
Our tables use single-column surrogate primary keys (`id` UUIDs). Therefore, all non-key attributes (like `name`, `email` for a User, or `originalFileName`, `fileSize` for a Document) depend entirely on that single primary key.

### 3NF (Third Normal Form)
**Rule**: The table must be in 2NF, and non-key attributes must not depend on other non-key attributes (no transitive dependencies).
**How we follow it**: 
We ensure that related entities are separated. Instead of storing the user's `email` or `name` inside the `Document` table (which would cause those fields to depend on the `userId` rather than the `Document.id`), we use a foreign key `userId`.

## Implementation Demonstration

In our Prisma schema, we demonstrate this separation into three distinct entities linked by foreign keys:

```prisma
model User {
  id           String     @id @default(uuid())
  email        String     @unique
  // User-specific non-key attributes
  documents    Document[] // Relation
}

model Document {
  id               String   @id @default(uuid())
  userId           String   // Foreign Key
  user             User     @relation(fields: [userId], references: [id])
  originalFileName String
  // Document-specific non-key attributes
}

model AIUsage {
  id            String   @id @default(uuid())
  userId        String   // Foreign Key
  documentId    String   // Foreign Key
  inputTokens   Int
  // Usage-specific non-key attributes
}
```

This normalized structure guarantees data integrity, prevents update anomalies (e.g., changing a user's email only needs to happen in one place), and reduces redundant data storage.
