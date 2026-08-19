FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS production-dependencies

RUN npm prune --omit=dev && npm cache clean --force

FROM node:22-bookworm-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV LOCAL_DATA_DIR=/app/data

COPY package.json package-lock.json ./
COPY --from=production-dependencies /app/node_modules ./node_modules

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=node:node /app/scripts/start-production.mjs ./scripts/start-production.mjs

# Home Assistant mounts its persistent app storage at /data.  That mount can
# be created with root ownership by Supervisor, so the process must be able to
# initialize the SQLite directory there.  The standalone compose deployment
# still uses /app/data (and keeps that directory available as well).
RUN mkdir -p /app/data /data && chown -R node:node /app/data /data

# Start briefly as root so Supervisor-created /data mounts can be repaired,
# then drop privileges before starting Next.js.
USER root

EXPOSE 3000

CMD ["node", "scripts/start-production.mjs"]
