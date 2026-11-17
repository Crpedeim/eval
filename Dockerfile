# One image, three roles (env ROLE):
#   web     Next.js on $PORT                      -> Cloud Run service
#   worker  pg-boss consumer, no HTTP             -> Cloud Run worker pool
#   migrate prisma migrate deploy, then exit      -> Cloud Run job
FROM node:22-slim AS build
WORKDIR /app
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

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app /app
# Real URLs come from Secret Manager at runtime; these only exist in the build stage.
ENV DIRECT_URL= DATABASE_URL=
CMD ["sh", "-c", "case \"$ROLE\" in worker) exec node --import tsx src/worker/index.ts ;; migrate) exec node_modules/.bin/prisma migrate deploy ;; *) exec node_modules/.bin/next start -p \"$PORT\" ;; esac"]
