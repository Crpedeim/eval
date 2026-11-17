/**
 * Start a RAG eval run on the worker, wait until every item and every judge run has
 * settled, then write the report (JSON + Markdown) to datasets/rag/results/.
 *
 *   npx tsx scripts/rag-eval.ts <projectId> datasets/rag/questions.json [k=5]
 *   RAG_RETRIEVAL=hybrid npx tsx scripts/rag-eval.ts ...   (vector | hybrid)
 */
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { createRagEvalRun, RagDataset, ragModelConfig } from "../src/lib/rag/eval";
import { ragEvalReport, type RagEvalReport } from "../src/lib/rag/report";
import { getEmbeddingProvider, getGenerationProvider, getJudgeProvider } from "../src/lib/providers";

const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined ? "—" : v.toFixed(d));

function markdown(r: RagEvalReport, wallSeconds: number, models: Record<string, string>) {
  const lines = [
    `# RAG eval — ${r.run.dataset} (run ${r.run.id})`,
    "",
    `- Date: ${r.run.createdAt.toISOString()}`,
    `- Models: generator \`${models.generator}\`, embedder \`${models.embedder}\`, judge \`${models.judge}\``,
    `- Retrieval: ${(r.run.config as { retrieval?: string } | null)?.retrieval ?? "vector"}`,
    `- k = ${r.run.k}; questions: ${r.items.total} (${r.items.done} answered, ${r.items.failed} failed)`,
    `- Wall clock from enqueue to all items + judges settled: ${wallSeconds.toFixed(0)}s`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Recall@${r.run.k} | ${f(r.retrieval.recallAtK)} |`,
    `| Hit rate@${r.run.k} | ${f(r.retrieval.hitRate)} |`,
    `| MRR@${r.run.k} | ${f(r.retrieval.mrr)} |`,
    ...r.judges.map((j) => `| ${j.evaluator} (mean score / pass rate @0.7) | ${f(j.meanScore)} / ${f(j.passRate)} (${j.judged} judged, ${j.errored} errored) |`),
    `| Answers with ≥1 citation | ${f(r.citations.citationRate)} |`,
    `| Citation precision (cited chunk is labelled relevant) | ${f(r.citations.citationPrecision)} |`,
    `| "I don't know" answers | ${r.citations.idk} |`,
    `| Request latency p50 / p95 | ${f(r.latency.request.p50Ms, 0)} / ${f(r.latency.request.p95Ms, 0)} ms |`,
    `| retrieve span p50 / p95 | ${f(r.latency.retrieve.p50Ms, 0)} / ${f(r.latency.retrieve.p95Ms, 0)} ms |`,
    `| generate span p50 / p95 | ${f(r.latency.generate.p50Ms, 0)} / ${f(r.latency.generate.p95Ms, 0)} ms |`,
    `| Generate prompt / output tokens (mean) | ${f(r.tokens.meanPrompt, 0)} / ${f(r.tokens.meanOutput, 1)} |`,
    `| Generate tokens/sec (median / mean / aggregate) | ${f(r.tokens.tokensPerSecMedian, 1)} / ${f(r.tokens.tokensPerSecMean, 1)} / ${f(r.tokens.tokensPerSecAggregate, 1)} |`,
    `| Cost per request (retrieve + generate, mean) | $${f(r.cost.meanPerRequestFromSpansUsd, 6)} |`,
    `| Total cost of answered requests | ${f(r.cost.totalUsd, 6)} |`,
    `| Judge cost per answer (mean, ${r.cost.judgeCalls} judge calls costed) | ${f(r.cost.meanJudgePerAnswerUsd, 6)} |`,
    `| **Cost per eval answer incl. judges (mean)** | ${f(r.cost.meanPerEvalAnswerUsd, 6)} |`,
    `| Judge tokens in / out (total, out incl. thinking) | ${r.cost.judgePromptTokens} / ${r.cost.judgeOutputTokens} |`,
    `| Total cost incl. judges | ${f(r.cost.totalWithJudgesUsd, 6)} |`,
    "",
    "## Per question",
    "",
    `| id | recall | RR | ${r.judges.map((j) => j.evaluator).join(" | ")} | latency | answer |`,
    `|---|---|---|${r.judges.map(() => "---").join("|")}|---|---|`,
    ...r.rows.map((row) =>
      `| ${row.questionId} | ${f(row.recallAtK, 2)} | ${f(row.reciprocalRank, 2)} | ${r.judges
        .map((j) => f(row.judges[j.evaluator]?.score ?? null, 2))
        .join(" | ")} | ${row.latencyMs ?? "—"} ms | ${(row.answer ?? row.error ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, 160)} |`
    ),
  ];
  return lines.join("\n") + "\n";
}

async function writeReport(report: RagEvalReport, name: string, wall: number, models: Record<string, string>) {
  mkdirSync("datasets/rag/results", { recursive: true });
  const base = `datasets/rag/results/${name}-${report.run.id}`;
  writeFileSync(`${base}.json`, JSON.stringify({ models, wallSeconds: wall, ...report }, null, 2));
  writeFileSync(`${base}.md`, markdown(report, wall, models));
  console.log(readFileSync(`${base}.md`, "utf8").split("## Per question")[0]);
  console.log(`wrote ${base}.json and ${base}.md`);
}

async function main() {
  // Recompute the report of an existing run from the database (no model calls):
  //   npx tsx scripts/rag-eval.ts --report <runId>
  if (process.argv[2] === "--report") {
    const runId = process.argv[3];
    const report = await ragEvalReport(runId);
    if (!report) throw new Error(`no run ${runId}`);
    const base = `datasets/rag/results/${report.run.dataset}-${runId}.json`;
    const prev = JSON.parse(readFileSync(base, "utf8"));
    await writeReport(report, report.run.dataset, prev.wallSeconds, prev.models);
    return;
  }

  const [projectId, datasetPath, kArg] = process.argv.slice(2);
  if (!projectId || !datasetPath) throw new Error("usage: rag-eval.ts <projectId> <dataset.json> [k]");
  const dataset = RagDataset.parse(JSON.parse(readFileSync(datasetPath, "utf8")));
  const k = Number(kArg ?? 5);
  const models = {
    generator: getGenerationProvider().model,
    embedder: getEmbeddingProvider().model,
    judge: getJudgeProvider().model,
  };

  const started = Date.now();
  const { runId, items } = await createRagEvalRun(projectId, dataset, {
    k,
    config: { ...ragModelConfig(), via: "cli" }, // retrieval mode from RAG_RETRIEVAL
  });
  console.log(`run ${runId}: enqueued ${items} questions (k=${k}) — the worker must be running`);

  let report: RagEvalReport | null = null;
  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    report = await ragEvalReport(runId);
    if (!report) throw new Error("run vanished");
    const judgePending = report.judges.reduce((a, j) => a + j.pending, 0);
    const expectedJudgeRuns = report.items.done * report.judges.length;
    const judgeSettled = report.judges.reduce((a, j) => a + j.judged + j.errored, 0);
    console.log(`items ${report.items.done + report.items.failed}/${report.items.total} settled, judge runs ${judgeSettled}/${expectedJudgeRuns} settled`);
    if (report.items.pending === 0 && judgePending === 0 && judgeSettled === expectedJudgeRuns) break;
    if (Date.now() - started > 45 * 60_000) throw new Error("timed out");
  }
  const wall = (Date.now() - started) / 1000;

  await writeReport(report!, dataset.name, wall, models);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); process.exit(); });
