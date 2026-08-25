# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Prisma requires OpenSSL for its native query engine.
RUN apt-get update \
    && apt-get install --no-install-recommends -y openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

FROM base AS builder

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate the Prisma client before Next.js compiles the server routes.
# This placeholder is used only while compiling; provide the real value at runtime.
ARG DATABASE_URL="postgresql://user:password@localhost:5432/metaamorfose"
ENV DATABASE_URL=$DATABASE_URL
RUN --mount=type=cache,target=/app/.next/cache \
    npx prisma generate && npm run build

FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
