import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { getBoss } from "../queue";
import { computeCostUsd } from "../pricing";
import { createEvalRunsAndEnqueue } from "../enqueue-evals";
import { getEmbeddingProvider, getGenerationProvider } from "../providers";
import type { EmbeddingProvider, GenerationProvider } from "../providers/types";
import { retrieve, retrievalMode, type RetrievalMode, type RetrievedChunk } from "./retrieve";
import { parseCitations, tokensPerSecond } from "./metrics";

export const RAG_TRACE_NAME = "rag.answer";
export const DEFAULT_K = 5;

export const RAG_SYSTEM = `You answer questions using ONLY the numbered context passages provided.
- Cite the passage(s) supporting each claim with their number in square brackets, e.g. [2] or [1][3].
- If the passages do not contain the answer, reply exactly: "I don't know based on the provided documents."
- Answer in at most four sentences. Do not mention the passages themselves beyond citing them.`;

function location(c: RetrievedChunk): string {
  const m = c.metadata ?? {};
  if (typeof m.page === "number") return `, page ${m.page}`;
  if (typeof m.row === "number") return `, row ${m.row}`;
  if (typeof m.heading === "string") return `, section "${m.heading}"`;
  return "";
}

export function buildRagPrompt(question: string, chunks: RetrievedChunk[]): string {
  const context = chunks
    .map((c, i) => `[${i + 1}] (source: ${c.documentName}${location(c)})\n${c.content}`)
    .join("\n\n");
  return `CONTEXT PASSAGES:\n\n${context}\n\n---\n\nQUESTION:\n${question}`;
}

export type SpanRecord = {
  name: string;
  model: string;
  startedAt: Date;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  metadata: Record<string, unknown>;
};

export type Citation = {
  n: number;
  chunkId: string;
  documentName: string;
  idx: number;
  score: number;
};

export type RagAnswer = {
  traceId: string;
  answer: string;
  citations: Citation[];
  chunks: RetrievedChunk[];
  spans: SpanRecord[];
  latencyMs: number;
  costUsd: number;
  evalsQueued: number;
};

export type AnswerOptions = {
  k?: number;
  /** vector-only or hybrid (vector + full-text, RRF); defaults to RAG_RETRIEVAL / DEFAULT_RETRIEVAL. */
  retrieval?: RetrievalMode;
  traceName?: string;
  metadata?: Record<string, unknown>;
  /** Extra writes committed atomically with the trace (e.g. settling an eval item). */
  inTransaction?: (tx: Prisma.TransactionClient, result: Omit<RagAnswer, "evalsQueued">) => Promise<void>;
};

/**
 * retrieve → generate → record. The answer is logged as an ordinary Trace (with one Span
 * per step), so every evaluator scoped to `rag.answer` — faithfulness, relevance — is
 * enqueued in the same transaction by the existing machinery and judged by the worker.
 */
export async function answerQuestion(
  projectId: string,
  question: string,
  opts: AnswerOptions = {},
  deps: { embedder?: EmbeddingProvider; generator?: GenerationProvider } = {}
): Promise<RagAnswer> {
  const embedder = deps.embedder ?? getEmbeddingProvider();
  const generator = deps.generator ?? getGenerationProvider();
  const k = opts.k ?? DEFAULT_K;
  const traceName = opts.traceName ?? RAG_TRACE_NAME;
  const wallStart = performance.now();

  // --- retrieve
  const retrieveStartedAt = new Date();
  const r = await retrieve(projectId, question, k, embedder, opts.retrieval ?? retrievalMode());
  const retrieveSpan: SpanRecord = {
    name: "retrieve",
    model: r.embedModel,
    startedAt: retrieveStartedAt,
    latencyMs: Math.round(r.embedMs + r.searchMs),
    promptTokens: r.queryTokensEst,
    completionTokens: 0,
    costUsd: computeCostUsd(r.embedModel, r.queryTokensEst, 0),
    metadata: {
      k,
      mode: r.mode,
      embedMs: Math.round(r.embedMs),
      searchMs: Math.round(r.searchMs * 10) / 10,
      chunkIds: r.chunks.map((c) => c.id),
      scores: r.chunks.map((c) => Math.round(c.score * 1e4) / 1e4),
      ...(r.mode === "hybrid" && {
        vectorRanks: r.chunks.map((c) => c.vectorRank ?? null),
        textRanks: r.chunks.map((c) => c.textRank ?? null),
      }),
      // Gemini's embedding API returns no usage, so query tokens are chars/4.
      tokensEstimated: true,
    },
  };

  // --- generate
  const prompt = buildRagPrompt(question, r.chunks);
  const generateStartedAt = new Date();
  const g0 = performance.now();
  const g = await generator.generate({ system: RAG_SYSTEM, prompt });
  const genMsRaw = performance.now() - g0;
  const genMs = Math.round(genMsRaw);
  const outputTokens = g.completionTokens + g.thoughtsTokens;
  const generateSpan: SpanRecord = {
    name: "generate",
    model: generator.model,
    startedAt: generateStartedAt,
    latencyMs: genMs,
    promptTokens: g.promptTokens,
    completionTokens: outputTokens,
    costUsd: computeCostUsd(generator.model, g.promptTokens, outputTokens),
    metadata: {
      visibleTokens: g.completionTokens,
      thoughtsTokens: g.thoughtsTokens,
      tokensPerSec: tokensPerSecond(outputTokens, genMsRaw),
    },
  };

  const cited = parseCitations(g.text, r.chunks.length);
  const citations: Citation[] = cited.map((n) => {
    const c = r.chunks[n - 1];
    return { n, chunkId: c.id, documentName: c.documentName, idx: c.idx, score: c.score };
  });

  const spans = [retrieveSpan, generateSpan];
  const latencyMs = Math.round(performance.now() - wallStart);
  const costUsd = spans.reduce((a, s) => a + s.costUsd, 0);

  await getBoss(); // resolve before opening the transaction, as the trace route does
  const { traceId, evalsQueued } = await db.$transaction(async (tx) => {
    const trace = await tx.trace.create({
      data: {
        projectId,
        name: traceName,
        input: `${RAG_SYSTEM}\n\n${prompt}`,
        output: g.text,
        model: generator.model,
        promptTokens: g.promptTokens,
        completionTokens: outputTokens,
        costUsd,
        latencyMs,
        metadata: {
          question,
          k,
          retrieval: r.mode,
          retrievedChunkIds: r.chunks.map((c) => c.id),
          citations,
          ...opts.metadata,
        } as Prisma.InputJsonValue,
        spans: {
          create: spans.map((s) => ({ ...s, metadata: s.metadata as Prisma.InputJsonValue })),
        },
      },
      select: { id: true },
    });

    const result = {
      traceId: trace.id, answer: g.text, citations, chunks: r.chunks, spans, latencyMs, costUsd,
    };
    await opts.inTransaction?.(tx, result);
    const evalsQueued = await createEvalRunsAndEnqueue(tx, trace.id, projectId, traceName);
    return { traceId: trace.id, evalsQueued };
  });

  return { traceId, answer: g.text, citations, chunks: r.chunks, spans, latencyMs, costUsd, evalsQueued };
}
