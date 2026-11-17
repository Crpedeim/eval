-- Nested spans for multi-agent traces: the caller's span id, its parent's id, a kind and a status.
ALTER TABLE "Span" ADD COLUMN "spanKey" TEXT,
ADD COLUMN "parentKey" TEXT,
ADD COLUMN "kind" TEXT,
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ok';

-- NULLs are distinct in a unique index, so spans without an id never collide.
CREATE UNIQUE INDEX "Span_traceId_spanKey_key" ON "Span"("traceId", "spanKey");
