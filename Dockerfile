# One image, three roles (env ROLE):
#   web     Next.js standalone server.js on $PORT  -> Cloud Run service
#   worker  pg-boss consumer, no HTTP              -> Cloud Run worker pool
#   migrate prisma migrate deploy, then exit       -> Cloud Run job
FROM node:22-slim AS base
# Prisma's CLI (migrate) looks for OpenSSL; node:*-slim does not ship it.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts reads DIRECT_URL at load time; generate/build never connect to it.
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
    NEXT_TELEMETRY_DISABLED=1
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate && npx next build
# Standalone server: it chdirs to its own folder, so it needs its own copy of the static
# assets and of the bundled eval datasets (read from ./datasets/rag at runtime).
RUN cp -r public .next/standalone/ \
  && cp -r .next/static .next/standalone/.next/ \
  && mkdir -p .next/standalone/datasets && cp -r datasets/rag .next/standalone/datasets/

FROM base
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
# Worker and migrate need the full app (tsx, sources, Prisma CLI); web runs .next/standalone.
COPY --from=build /app /app
# Real URLs come from Secret Manager at runtime; these only exist in the build stage.
ENV DIRECT_URL= DATABASE_URL=
CMD ["sh", "-c", "case \"$ROLE\" in worker) exec node --import tsx src/worker/index.ts ;; migrate) exec node_modules/.bin/prisma migrate deploy ;; *) cd .next/standalone && exec node server.js ;; esac"]
