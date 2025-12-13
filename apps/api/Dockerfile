# QANexus API - Production Dockerfile
# For Railway deployment from monorepo root context

# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed for native modules
RUN apk add --no-cache libc6-compat

# Copy root package files and workspace configuration
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/

# Install all dependencies for the workspace (including dev for building)
RUN npm ci --workspace=api

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json* ./

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy workspace structure
COPY apps/api/ ./apps/api/

# Build the API application
RUN npm run build --workspace=api

# Remove dev dependencies, keeping only production deps
RUN npm prune --production --workspace=api

# ============================================
# Stage 3: Production Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
CMD ["node", "dist/main.js"]
