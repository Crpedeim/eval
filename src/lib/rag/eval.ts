import { z } from "zod";
import { fromPrisma } from "pg-boss";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { getBoss, RAG_EVAL_QUEUE, RAG_EVAL_DLQ } from "../queue";
import { PermanentError } from "../errors";
import type { EmbeddingProvider, GenerationProvider } from "../providers/types";
import { getEmbeddingProvider, getGenerationProvider, getJudgeProvider } from "../providers";
import { answerQuestion, DEFAULT_K, RAG_TRACE_NAME } from "./pipeline";
import { retrievalMode, type RetrievalMode } from "./retrieve";
import { recallAtK, reciprocalRank, relevantRanks } from "./metrics";

export const RagDataset = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  questions: z
    .array(
      z.object({
        id: z.string().min(1),
        question: z.string().min(1),
        /** Verbatim spans from the corpus; a chunk containing one is relevant. */
        evidence: z.array(z.string().min(8)).min(1),
        source: z.string().optional(),
      })
    )
    .min(1),
});
export type RagDataset = z.infer<typeof RagDataset>;

/** Models and settings recorded on every run, so a report says exactly what produced it. */
export function ragModelConfig(retrieval?: RetrievalMode) {
  return {
    retrieval: retrievalMode(retrieval),
    generator: getGenerationProvider().model,
    embedder: getEmbeddingProvider().model,
    judge: getJudgeProvider().model,
    thinkingBudget: process.env.RAG_THINKING_BUDGET ?? null,
    thinkingLevel: process.env.RAG_THINKING_LEVEL ?? null,
  };
}

export type RagEvalJobData = { itemId: string; projectId: string };

/** Run + one item per question + one job per item, all in one transaction. */
export async function createRagEvalRun(
  projectId: string,
  dataset: RagDataset,
  opts: { k?: number; config?: Record<string, unknown> } = {}
) {
  const k = opts.k ?? DEFAULT_K;
  await getBoss();
  return db.$transaction(async (tx) => {
    const run = await tx.ragEvalRun.create({
      data: { projectId, dataset: dataset.name, k, config: (opts.config ?? {}) as Prisma.InputJsonValue },
    });
    const items = await tx.ragEvalItem.createManyAndReturn({
      data: dataset.questions.map((q) => ({
        runId: run.id,
        questionId: q.id,
        question: q.question,
        evidence: q.evidence,
      })),
      select: { id: true },
    });
    const boss = await getBoss();
    // One INSERT for all jobs: a send() per item is one round trip each, and 150 of them
    // to a remote database outlived the 30 s transaction timeout.
    await boss.insert(
      RAG_EVAL_QUEUE,
      items.map((item) => ({
        data: { itemId: item.id, projectId } satisfies RagEvalJobData,
        retryLimit: 6,
        retryDelay: 5,
        retryBackoff: true,
        retryDelayMax: 120,
        expireInSeconds: 300,
        deadLetter: RAG_EVAL_DLQ,
      })),
      { db: fromPrisma(tx) }
    );
    return { runId: run.id, items: items.length };
  });
}

/**
 * Worker body for one labelled question: answer it through the real pipeline, score
 * retrieval against the labels, and settle the item in the trace's own transaction —
 * so a crash can't leave a scored item without its trace or vice versa.
 * Caller must already have claimed the item (status = running).
 */
export async function evaluateItem(
  itemId: string,
  deps: { embedder?: EmbeddingProvider; generator?: GenerationProvider } = {}
) {
  const item = await db.ragEvalItem.findUnique({ where: { id: itemId }, include: { run: true } });
  if (!item) throw new PermanentError(`rag eval item ${itemId} not found`);
  const evidence = z.array(z.string()).parse(item.evidence);

  const result = await answerQuestion(
    item.run.projectId,
    item.question,
    {
      k: item.run.k,
      // The run's recorded mode, not the worker's env: one worker can serve runs in both modes.
      retrieval: retrievalMode((item.run.config as { retrieval?: unknown } | null)?.retrieval),
      traceName: RAG_TRACE_NAME,
      metadata: { ragEvalRunId: item.runId, questionId: item.questionId },
      inTransaction: async (tx, r) => {
        const contents = r.chunks.map((c) => c.content);
        await tx.ragEvalItem.updateMany({
          where: { id: itemId, status: "running" },
          data: {
            status: "done",
            traceId: r.traceId,
            retrievedIds: r.chunks.map((c) => c.id),
            relevantRanks: relevantRanks(contents, evidence),
            recallAtK: recallAtK(contents, evidence, item.run.k),
            reciprocalRank: reciprocalRank(contents, evidence),
            error: null,
          },
        });
      },
    },
    deps
  );
  return result;
}
