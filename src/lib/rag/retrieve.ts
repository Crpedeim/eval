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
  /** Hybrid only: 1-based rank in the vector and full-text lists (null = not in that list). */
  vectorRank?: number | null;
  textRank?: number | null;
  /** Hybrid only: reciprocal rank fusion score the final order is sorted by. */
  rrf?: number;
};

export type RetrievalMode = "vector" | "hybrid";
export const RETRIEVAL_MODES: RetrievalMode[] = ["vector", "hybrid"];

/**
 * Default retrieval mode, chosen by the public benchmark (PHASES.md, Phase 2); overridable
 * with RAG_RETRIEVAL. An eval run records its mode, so the worker honours the run's mode.
 */
export const DEFAULT_RETRIEVAL: RetrievalMode = "vector";

export function retrievalMode(value?: unknown): RetrievalMode {
  const v = value ?? process.env.RAG_RETRIEVAL;
  return RETRIEVAL_MODES.includes(v as RetrievalMode) ? (v as RetrievalMode) : DEFAULT_RETRIEVAL;
}

/** Constant from Cormack, Clarke & Buettcher (SIGIR 2009); dampens the weight of top ranks. */
export const RRF_K = 60;

/** How deep each list is read before fusing: enough for a chunk ranked low in one list to surface. */
export const candidatePool = (k: number) => Math.max(4 * k, 20);

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

/**
 * Vector search and Postgres full-text search, each read `pool` deep, merged with
 * reciprocal rank fusion: score(d) = Σ 1 / (RRF_K + rank_list(d)). One SQL round trip.
 *
 * The text query ORs the question's stemmed terms (plainto_tsquery ANDs them, which a
 * natural-language question almost never satisfies in full) and ranks with ts_rank_cd.
 * `to_tsvector('english', content)` matches the expression GIN index from the
 * 20261117130000_chunk_fts migration exactly, so Postgres can use it.
 */
export async function searchHybrid(
  projectId: string,
  question: string,
  vector: number[],
  k: number,
  dimensions: number,
  pool = candidatePool(k)
): Promise<RetrievedChunk[]> {
  const lit = toVectorLiteral(vector, dimensions);
  return db.$queryRaw<RetrievedChunk[]>`
    with
    q as (
      select nullif(replace(plainto_tsquery('english', ${question})::text, '&', '|'), '')::tsquery as query
    ),
    vec as (
      select c.id, row_number() over (order by c.embedding <=> ${lit}::vector) as rank
      from "Chunk" c
      where c."projectId" = ${projectId}
      order by c.embedding <=> ${lit}::vector
      limit ${pool}
    ),
    fts as (
      select c.id,
             row_number() over (order by ts_rank_cd(to_tsvector('english', c.content), q.query) desc, c.id) as rank
      from "Chunk" c, q
      where c."projectId" = ${projectId}
        and q.query is not null
        and to_tsvector('english', c.content) @@ q.query
      order by ts_rank_cd(to_tsvector('english', c.content), q.query) desc, c.id
      limit ${pool}
    ),
    fused as (
      select coalesce(vec.id, fts.id) as id,
             vec.rank as "vectorRank",
             fts.rank as "textRank",
             coalesce(1.0 / (${RRF_K} + vec.rank), 0) + coalesce(1.0 / (${RRF_K} + fts.rank), 0) as rrf
      from vec full outer join fts on fts.id = vec.id
    )
    select c.id, c."documentId", d.name as "documentName", c.idx, c.content, c.metadata,
           (1 - (c.embedding <=> ${lit}::vector))::float8 as score,
           f."vectorRank"::int as "vectorRank", f."textRank"::int as "textRank", f.rrf::float8 as rrf
    from fused f
    join "Chunk" c on c.id = f.id
    join "Document" d on d.id = c."documentId"
    order by f.rrf desc, f."vectorRank" asc nulls last, c.id
    limit ${k}
  `;
}

export type Retrieval = {
  mode: RetrievalMode;
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
  embedder: EmbeddingProvider = getEmbeddingProvider(),
  mode: RetrievalMode = retrievalMode()
): Promise<Retrieval> {
  const t0 = performance.now();
  const [vector] = await embedder.embed([question], "query");
  const embedMs = performance.now() - t0;

  const t1 = performance.now();
  const chunks =
    mode === "hybrid"
      ? await searchHybrid(projectId, question, vector, k, embedder.dimensions)
      : await searchByVector(projectId, vector, k, embedder.dimensions);
  const searchMs = performance.now() - t1;

  return {
    mode,
    chunks,
    embedMs,
    searchMs,
    queryTokensEst: estimateTokens(question),
    embedModel: embedder.model,
  };
}
