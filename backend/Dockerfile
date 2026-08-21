# Multi-stage production build for DocuMind Backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Copy application source
COPY tsconfig.json ./
COPY src ./src/

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Production runner stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev
RUN npx prisma generate

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Create uploads directory with correct permissions
RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "dist/server.js"]
