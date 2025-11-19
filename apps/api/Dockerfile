# Multi-stage build for NexusCore API
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0

# Set working directory
WORKDIR /app

# Copy root package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json ./

# ================================
# Dependencies stage
# ================================
FROM base AS dependencies

# Copy all package.json files
COPY packages/types/package.json ./packages/types/
COPY packages/db/package.json ./packages/db/
COPY packages/config/package.json ./packages/config/
COPY apps/api/package.json ./apps/api/

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# ================================
# Build stage
# ================================
FROM base AS build

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY packages/db ./packages/db
COPY packages/config ./packages/config
COPY apps/api ./apps/api

# Generate Prisma Client
WORKDIR /app/packages/db
RUN pnpm prisma generate

# Build the API
WORKDIR /app/apps/api
RUN pnpm build

# ================================
# Production stage
# ================================
FROM node:18-alpine AS production

# Install pnpm and dumb-init for proper signal handling
RUN npm install -g pnpm@8.15.0 && \
    apk add --no-cache dumb-init wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=nodejs:nodejs turbo.json ./
COPY --chown=nodejs:nodejs packages/types/package.json ./packages/types/
COPY --chown=nodejs:nodejs packages/db/package.json ./packages/db/
COPY --chown=nodejs:nodejs packages/config/package.json ./packages/config/
COPY --chown=nodejs:nodejs apps/api/package.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --chown=nodejs:nodejs --from=build /app/packages/types/dist ./packages/types/dist
COPY --chown=nodejs:nodejs --from=build /app/packages/types/package.json ./packages/types/
COPY --chown=nodejs:nodejs --from=build /app/packages/db/prisma ./packages/db/prisma
COPY --chown=nodejs:nodejs --from=build /app/packages/db/package.json ./packages/db/
COPY --chown=nodejs:nodejs --from=build /app/packages/db/node_modules/.prisma ./packages/db/node_modules/.prisma
COPY --chown=nodejs:nodejs --from=build /app/apps/api/dist ./apps/api/dist
COPY --chown=nodejs:nodejs --from=build /app/apps/api/package.json ./apps/api/

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

# Set working directory to API
WORKDIR /app/apps/api

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
