-- Full-text search over chunks for hybrid retrieval (pgvector + Postgres FTS, fused with RRF).
-- An expression index, so no column to keep in sync; queries must use exactly
-- to_tsvector('english', content) to hit it (see searchHybrid in src/lib/rag/retrieve.ts).
CREATE INDEX "Chunk_content_fts_idx" ON "Chunk" USING gin (to_tsvector('english', "content"));
