import { db } from "../db";
import { getEmbeddingProvider } from "../providers";
import type { EmbeddingProvider } from "../providers/types";
import { estimateTokens } from "./metrics";
import { toVectorLiteral } from "./vector";

export type RetrievedChunk = {
  id: string;
  documentId: string;
  documentName: string;
  idx: number;
  content: string;
  metadata: Record<string, unknown> | null;
  /** Cosine similarity, 1 = identical direction. */
  score: number;
};

/**
 * Top-k chunks in a project by cosine distance (pgvector `<=>`, served by the HNSW index).
 * `projectId` is always bound: retrieval can never cross a tenant boundary.
 */
export async function searchByVector(
  projectId: string,
  vector: number[],
  k: number,
  dimensions: number
): Promise<RetrievedChunk[]> {
  const lit = toVectorLiteral(vector, dimensions);
  return db.$queryRaw<RetrievedChunk[]>`
    select c.id, c."documentId", d.name as "documentName", c.idx, c.content, c.metadata,
           (1 - (c.embedding <=> ${lit}::vector))::float8 as score
    from "Chunk" c
    join "Document" d on d.id = c."documentId"
    where c."projectId" = ${projectId}
    order by c.embedding <=> ${lit}::vector
    limit ${k}
  `;
}

export type Retrieval = {
  chunks: RetrievedChunk[];
  embedMs: number;
  searchMs: number;
  queryTokensEst: number;
  embedModel: string;
};

export async function retrieve(
  projectId: string,
  question: string,
  k: number,
  embedder: EmbeddingProvider = getEmbeddingProvider()
): Promise<Retrieval> {
  const t0 = performance.now();
  const [vector] = await embedder.embed([question], "query");
  const embedMs = performance.now() - t0;

  const t1 = performance.now();
  const chunks = await searchByVector(projectId, vector, k, embedder.dimensions);
  const searchMs = performance.now() - t1;

  return {
    chunks,
    embedMs,
    searchMs,
    queryTokensEst: estimateTokens(question),
    embedModel: embedder.model,
  };
}
