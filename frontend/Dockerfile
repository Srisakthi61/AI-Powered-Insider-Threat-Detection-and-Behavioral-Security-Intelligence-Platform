# ==============================================================================
# ITBIS Frontend - Dockerfile (Next.js 16 Multi-stage Production Build)
# ==============================================================================

# Build Stage
FROM node:22-alpine AS builder

WORKDIR /app

# Prevent Puppeteer browser download during container build
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --fetch-retries=5

# Copy application source code
COPY . .

# Set environment for production build
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

RUN npm run build

# Runner Stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root system user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application and required assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["npm", "start"]
