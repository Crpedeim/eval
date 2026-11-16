-- pgvector: available on Neon and on stock Postgres with the extension package installed.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('markdown', 'text', 'pdf', 'csv');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('queued', 'running', 'ready', 'failed');

-- AlterTable
ALTER TABLE "Evaluator" ADD COLUMN     "traceName" TEXT;

-- CreateTable
CREATE TABLE "Span" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(14,8) NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Span_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'queued',
    "content" TEXT,
    "bytes" BYTEA,
    "sizeBytes" INTEGER NOT NULL,
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "stats" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chunk" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "idx" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagEvalRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dataset" TEXT NOT NULL,
    "k" INTEGER NOT NULL,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RagEvalRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RagEvalItem" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "status" "EvalStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "traceId" TEXT,
    "retrievedIds" JSONB,
    "relevantRanks" JSONB,
    "recallAtK" DOUBLE PRECISION,
    "reciprocalRank" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RagEvalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Span_traceId_idx" ON "Span"("traceId");

-- CreateIndex
CREATE INDEX "Document_projectId_createdAt_idx" ON "Document"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Chunk_projectId_idx" ON "Chunk"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Chunk_documentId_idx_key" ON "Chunk"("documentId", "idx");

-- CreateIndex
CREATE INDEX "RagEvalRun_projectId_createdAt_idx" ON "RagEvalRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "RagEvalItem_runId_idx" ON "RagEvalItem"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RagEvalItem_runId_questionId_key" ON "RagEvalItem"("runId", "questionId");

-- AddForeignKey
ALTER TABLE "Span" ADD CONSTRAINT "Span_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chunk" ADD CONSTRAINT "Chunk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagEvalRun" ADD CONSTRAINT "RagEvalRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagEvalItem" ADD CONSTRAINT "RagEvalItem_runId_fkey" FOREIGN KEY ("runId") REFERENCES "RagEvalRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RagEvalItem" ADD CONSTRAINT "RagEvalItem_traceId_fkey" FOREIGN KEY ("traceId") REFERENCES "Trace"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Approximate nearest-neighbour index for cosine distance (the operator retrieval uses: <=>).
CREATE INDEX "Chunk_embedding_hnsw_idx" ON "Chunk" USING hnsw ("embedding" vector_cosine_ops);
