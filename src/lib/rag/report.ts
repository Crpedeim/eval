import { z } from "zod";
import { db } from "../db";
import { mean, percentile, tokensPerSecond } from "./metrics";

const CitationsMeta = z.object({ citations: z.array(z.object({ chunkId: z.string() })).default([]) });

export type JudgeSummary = {
  evaluator: string;
  judged: number;
  errored: number;
  pending: number;
  meanScore: number | null;
  passRate: number | null;
};

export type SpanSummary = { p50Ms: number | null; p95Ms: number | null; meanMs: number | null };

export type RagEvalReport = Awaited<ReturnType<typeof ragEvalReport>>;

/**
 * Every number shown for an eval run, computed in one place so the UI and the CLI
 * report can't disagree. Retrieval metrics come from the item rows; judge scores from
 * the EvalRun rows the existing worker settled on each item's trace.
 */
export async function ragEvalReport(runId: string) {
  const run = await db.ragEvalRun.findUnique({
    where: { id: runId },
    include: {
      items: {
        orderBy: { questionId: "asc" },
        include: {
          trace: {
            include: {
              spans: { orderBy: { startedAt: "asc" } },
              evalRuns: { include: { evaluator: true } },
            },
          },
        },
      },
    },
  });
  if (!run) return null;

  const done = run.items.filter((i) => i.status === "done");
  const traces = done.flatMap((i) => (i.trace ? [i.trace] : []));
  const spans = traces.flatMap((t) => t.spans);
  const byName = (n: string) => spans.filter((s) => s.name === n);
  const summarize = (xs: number[]): SpanSummary => ({
    p50Ms: percentile(xs, 0.5), p95Ms: percentile(xs, 0.95), meanMs: mean(xs),
  });

  // judges
  const judgeNames = [...new Set(traces.flatMap((t) => t.evalRuns.map((r) => r.evaluator.name)))].sort();
  const judges: JudgeSummary[] = judgeNames.map((name) => {
    const runs = traces.flatMap((t) => t.evalRuns.filter((r) => r.evaluator.name === name));
    const settled = runs.filter((r) => r.status === "done");
    return {
      evaluator: name,
      judged: settled.length,
      errored: runs.filter((r) => r.status === "failed").length,
      pending: runs.filter((r) => r.status === "queued" || r.status === "running").length,
      meanScore: mean(settled.map((r) => r.score ?? 0)),
      passRate: settled.length ? settled.filter((r) => r.passed).length / settled.length : null,
    };
  });

  // generation throughput
  const gen = byName("generate");
  const perRequestTps = gen.flatMap((s) => {
    const v = tokensPerSecond(s.completionTokens, s.latencyMs);
    return v === null ? [] : [v];
  });
  const genTokens = gen.reduce((a, s) => a + s.completionTokens, 0);
  const genMs = gen.reduce((a, s) => a + s.latencyMs, 0);

  // citations: how often answers cite, and how often a cited chunk is a labelled-relevant one
  let cited = 0, citedRelevant = 0, answersWithCitation = 0;
  for (const i of done) {
    const meta = CitationsMeta.safeParse(i.trace?.metadata);
    const ids = meta.success ? meta.data.citations.map((c) => c.chunkId) : [];
    if (ids.length) answersWithCitation++;
    const retrieved = (i.retrievedIds as string[] | null) ?? [];
    const relevant = new Set(((i.relevantRanks as number[] | null) ?? []).map((r) => retrieved[r - 1]));
    cited += ids.length;
    citedRelevant += ids.filter((id) => relevant.has(id)).length;
  }

  const costs = traces.map((t) => Number(t.costUsd));
  const spanCosts = spans.reduce((a, s) => a + Number(s.costUsd), 0);

  return {
    run: { id: run.id, dataset: run.dataset, k: run.k, createdAt: run.createdAt, config: run.config },
    items: {
      total: run.items.length,
      done: done.length,
      failed: run.items.filter((i) => i.status === "failed").length,
      pending: run.items.filter((i) => i.status === "queued" || i.status === "running").length,
    },
    retrieval: {
      recallAtK: mean(done.map((i) => i.recallAtK ?? 0)),
      mrr: mean(done.map((i) => i.reciprocalRank ?? 0)),
      hitRate: done.length ? done.filter((i) => (i.recallAtK ?? 0) > 0).length / done.length : null,
    },
    judges,
    citations: {
      answersWithCitation,
      citationRate: done.length ? answersWithCitation / done.length : null,
      citationPrecision: cited ? citedRelevant / cited : null,
      idk: traces.filter((t) => /I don't know based on the provided documents/i.test(t.output)).length,
    },
    latency: {
      request: summarize(traces.map((t) => t.latencyMs ?? 0)),
      retrieve: summarize(byName("retrieve").map((s) => s.latencyMs)),
      generate: summarize(gen.map((s) => s.latencyMs)),
    },
    tokens: {
      meanPrompt: mean(gen.map((s) => s.promptTokens)),
      meanOutput: mean(gen.map((s) => s.completionTokens)),
      tokensPerSecMedian: percentile(perRequestTps, 0.5),
      tokensPerSecMean: mean(perRequestTps),
      tokensPerSecAggregate: genMs ? genTokens / (genMs / 1000) : null,
    },
    cost: {
      meanPerRequestUsd: mean(costs),
      // Span-level sum (8 dp) — Trace.costUsd is rounded to 6 dp by its column type.
      totalUsd: spanCosts,
      meanPerRequestFromSpansUsd: traces.length ? spanCosts / traces.length : null,
    },
    rows: run.items.map((i) => ({
      id: i.id,
      questionId: i.questionId,
      question: i.question,
      status: i.status,
      error: i.error,
      traceId: i.traceId,
      answer: i.trace?.output ?? null,
      recallAtK: i.recallAtK,
      reciprocalRank: i.reciprocalRank,
      relevantRanks: (i.relevantRanks as number[] | null) ?? [],
      latencyMs: i.trace?.latencyMs ?? null,
      costUsd: i.trace ? Number(i.trace.costUsd) : null,
      judges: Object.fromEntries(
        (i.trace?.evalRuns ?? []).map((r) => [r.evaluator.name, { status: r.status, score: r.score, passed: r.passed }])
      ) as Record<string, { status: string; score: number | null; passed: boolean | null }>,
    })),
  };
}
