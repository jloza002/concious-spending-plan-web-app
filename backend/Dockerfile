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

COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./
COPY --from=builder /app/shared/package.json shared/
COPY --from=builder /app/backend/package.json backend/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/shared/dist shared/dist
COPY --from=builder /app/backend/dist backend/dist
COPY --from=builder /app/backend/prisma backend/prisma
COPY --from=builder /app/backend/node_modules/.prisma backend/node_modules/.prisma

ENV NODE_ENV=production
EXPOSE 4000

CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=backend/prisma/schema.prisma && node backend/dist/server.js"]
