# One image, two Cloud Run services: ROLE=web (Next.js) or ROLE=worker (pg-boss consumer).
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts reads DIRECT_URL at load time; generate/build never connect to it.
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate && npx next build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY --from=build /app /app
# Migrations: run the image with ROLE=migrate (Cloud Run job) before deploying services.
CMD ["sh", "-c", "case \"$ROLE\" in worker) exec npx tsx src/worker/index.ts ;; migrate) exec npx prisma migrate deploy ;; *) exec npx next start -p \"$PORT\" ;; esac"]
