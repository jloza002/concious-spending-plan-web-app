# Build stage
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY shared/package.json shared/
COPY backend/package.json backend/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY shared/ shared/
COPY backend/ backend/

# Build shared package first (backend depends on its compiled types)
RUN pnpm --filter @csp/shared run build

# Generate Prisma client and build backend
RUN pnpm --filter @csp/backend run db:generate
RUN pnpm --filter @csp/backend run build

# Production stage
FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/backend/package.json backend/

# Install dependencies fresh so pnpm binaries (prisma, etc.) are correctly generated
RUN pnpm install --frozen-lockfile

# Copy compiled output from builder
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/prisma backend/prisma

# Regenerate Prisma client for this environment
RUN pnpm --filter @csp/backend run db:generate

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter @csp/backend run db:deploy && node backend/dist/server.js"]
