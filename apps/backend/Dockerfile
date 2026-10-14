# Stage 1: Build NestJS application in monorepo context
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native bindings if required
RUN apk add --no-cache python3 make g++

# Copy monorepo package manifests
COPY package.json package-lock.json ./
COPY apps/backend/package.json ./apps/backend/

# Install dependencies for the backend workspace
RUN npm ci

# Copy backend source code and configuration
COPY apps/backend ./apps/backend

# Build the backend application
RUN npm run build -w apps/backend

# Prune development dependencies to keep final image minimal
RUN npm prune --omit=dev

# Stage 2: Minimal production container
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Run as non root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production node_modules and built code
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/apps/backend/package.json ./apps/backend/
COPY --from=builder --chown=appuser:appgroup /app/apps/backend/dist ./apps/backend/dist

USER appuser

EXPOSE 10000

WORKDIR /app/apps/backend

CMD ["node", "dist/main"]
