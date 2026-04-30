# =============================================================================
# PrepX Production Dockerfile — Multi-Stage Build
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Dependencies
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies (cached layer if package.json doesn't change)
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# ---------------------------------------------------------------------------
# Stage 2: Build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install Python deps for any scripts that may run during build
RUN apk add --no-cache python3 py3-pip

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments (passed from Coolify / CI)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_RAZORPAY_KEY_ID
ARG RAZORPAY_KEY_SECRET
ARG RAZORPAY_WEBHOOK_SECRET
ARG GROQ_BASE_URL
ARG GROQ_API_KEYS
ARG ADMIN_API_KEY
ARG OLLAMA_BASE_URL
ARG OLLAMA_API_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_RAZORPAY_KEY_ID=$NEXT_PUBLIC_RAZORPAY_KEY_ID
ENV RAZORPAY_KEY_SECRET=$RAZORPAY_KEY_SECRET
ENV RAZORPAY_WEBHOOK_SECRET=$RAZORPAY_WEBHOOK_SECRET
ENV GROQ_BASE_URL=$GROQ_BASE_URL
ENV GROQ_API_KEYS=$GROQ_API_KEYS
ENV ADMIN_API_KEY=$ADMIN_API_KEY
ENV OLLAMA_BASE_URL=$OLLAMA_BASE_URL
ENV OLLAMA_API_KEY=$OLLAMA_API_KEY

# Build the production bundle
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: Production Runner
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Only copy what's needed to run the app
# standalone output is used for minimal footprint
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Supabase scripts for migration (optional)
COPY --from=builder /app/supabase ./supabase
COPY --from=builder /app/scripts ./scripts

# Drop to non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

# Health check for orchestrators (Coolify, Docker Swarm, K8s).
# Use $PORT so the probe follows the orchestrator-assigned port (Coolify
# overrides PORT at runtime — e.g. 3091 — so a hardcoded 3000 fails).
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --quiet --tries=1 --spider "http://localhost:${PORT:-3000}/api/health" || exit 1

CMD ["node", "server.js"]
