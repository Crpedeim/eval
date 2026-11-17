/**
 * Export the report of an eval run that was started outside rag-eval.ts (e.g. from the
 * Run evaluation button), with wall-clock times taken from database timestamps. Read-only.
 *
 *   npx tsx scripts/rag-eval-export.ts <runId> <label>
 *   -> datasets/rag/results/<label>-<dataset>-<runId>.json
 */
import "dotenv/config";
import { writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { ragEvalReport } from "../src/lib/rag/report";

const f = (v: number | null, d = 3) => (v === null ? "—" : v.toFixed(d));

async function main() {
  const [runId, label] = process.argv.slice(2);
  const r = await ragEvalReport(runId);
  if (!r) throw new Error(`no run ${runId}`);
  const items = await db.ragEvalItem.findMany({ where: { runId }, select: { updatedAt: true } });
  const judgeRuns = await db.evalRun.findMany({
    where: { trace: { ragEvalItems: { some: { runId } } } },
    select: { updatedAt: true },
  });
  const t0 = r.run.createdAt.getTime();
  const answersSettledSeconds = (Math.max(...items.map((i) => i.updatedAt.getTime())) - t0) / 1000;
  const wallSeconds = (Math.max(...judgeRuns.map((j) => j.updatedAt.getTime())) - t0) / 1000;
  const out = `datasets/rag/results/${label}-${r.run.dataset}-${runId}.json`;
  writeFileSync(out, JSON.stringify({ label, answersSettledSeconds, wallSeconds, ...r }, null, 2));
  console.log(JSON.stringify({
    out, config: r.run.config, items: r.items,
    recallAtK: f(r.retrieval.recallAtK), mrr: f(r.retrieval.mrr),
    judges: r.judges.map((j) => ({ name: j.evaluator, mean: f(j.meanScore), judged: j.judged, errored: j.errored })),
    requestP50: r.latency.request.p50Ms, requestP95: r.latency.request.p95Ms,
    retrieveP50: r.latency.retrieve.p50Ms, generateP50: r.latency.generate.p50Ms,
    costPerAnswer: f(r.cost.meanPerRequestFromSpansUsd, 6), costPerEvalAnswer: f(r.cost.meanPerEvalAnswerUsd, 6),
    judgeCalls: r.cost.judgeCalls, totalWithJudges: f(r.cost.totalWithJudgesUsd, 4),
    answersSettledSeconds, wallSeconds,
  }, null, 1));
}

main().finally(() => db.$disconnect());
