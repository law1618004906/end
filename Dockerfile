# Multi-stage build for Next.js + custom server.ts (tsx) + Prisma (SQLite)

# 1) Builder stage
FROM node:20-bullseye AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json ./
# Use a stable install path that doesn't require a lockfile
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Generate Prisma client and build Next app
RUN npx prisma generate
RUN npm run build


# 2) Runner stage
FROM node:20-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Create directory for persistent Prisma SQLite DB inside container (will be mounted by compose)
RUN mkdir -p /app/prisma-data

# Install curl for healthcheck and general debugging
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Copy only production node_modules and necessary files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Next.js build output
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# App source required by server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.prod.cjs ./server.prod.cjs

# Prisma schema (for migrate deploy) and generated client
COPY --from=builder /app/prisma ./prisma

# Copy entrypoint script
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

# Basic healthcheck (adjust /api/health if different)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/entrypoint.sh"]
