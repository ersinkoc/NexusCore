# Multi-stage build for NexusCore Web
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
COPY packages/ui/package.json ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# ================================
# Build stage
# ================================
FROM base AS build

# Copy installed dependencies from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/packages ./packages
COPY --from=dependencies /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code
COPY packages/types ./packages/types
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
COPY apps/web ./apps/web

# Build environment variables
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the web app
WORKDIR /app/apps/web
RUN pnpm build

# ================================
# Production stage with Nginx
# ================================
FROM nginx:alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from build stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -g 1001 -S nginx && \
    adduser -S nginx -u 1001 -G nginx || true

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
