/**
 * Compare eval runs (e.g. vector-only vs hybrid) written by scripts/rag-eval.ts. No model
 * calls: everything comes from the report JSONs plus the dataset's gold answers.
 *
 *   npx tsx scripts/rag-bench-compare.ts datasets/rag/hotpotqa/questions.json \
 *     datasets/rag/results/<vector-run>.json datasets/rag/results/<hybrid-run>.json > out.md
 */
import { readFileSync } from "fs";

type Row = {
  questionId: string; status: string; answer: string | null;
  recallAtK: number | null; reciprocalRank: number | null; relevantRanks: number[];
  latencyMs: number | null; costUsd: number | null; judgeCostUsd?: number | null;
  judges: Record<string, { status: string; score: number | null; passed: boolean | null }>;
};
type Report = {
  run: { id: string; k: number; config: { retrieval?: string } | null };
  wallSeconds: number;
  items: { total: number; done: number; failed: number };
  retrieval: { recallAtK: number | null; mrr: number | null; hitRate: number | null };
  judges: { evaluator: string; meanScore: number | null; passRate: number | null; judged: number; errored: number }[];
  latency: { request: { p50Ms: number | null; p95Ms: number | null }; retrieve: { p50Ms: number | null; p95Ms: number | null } };
  cost: { meanPerRequestFromSpansUsd: number | null; meanJudgePerAnswerUsd: number | null; meanPerEvalAnswerUsd: number | null; totalWithJudgesUsd: number };
  rows: Row[];
};
type Q = { id: string; answer?: string; type?: string; evidence: string[] };

/** SQuAD-style normalisation: lowercase, drop punctuation and articles, collapse spaces. */
const norm = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\b(a|an|the)\b/g, " ").replace(/\s+/g, " ").trim();

const f = (v: number | null | undefined, d = 3) => (v === null || v === undefined ? "—" : v.toFixed(d));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

const [datasetPath, ...reportPaths] = process.argv.slice(2);
const questions = new Map<string, Q>(
  (JSON.parse(readFileSync(datasetPath, "utf8")).questions as Q[]).map((q) => [q.id, q])
);
const reports = reportPaths.map((p) => JSON.parse(readFileSync(p, "utf8")) as Report);
const label = (r: Report) => r.run.config?.retrieval ?? "vector";

function derived(r: Report) {
  const done = r.rows.filter((x) => x.status === "done");
  const contains = done.filter((x) => {
    const gold = questions.get(x.questionId)?.answer;
    return gold && x.answer && norm(x.answer).includes(norm(gold));
  }).length;
  const allFound = done.filter((x) => x.recallAtK === 1).length;
  const idk = done.filter((x) => /^\s*I don't know based on the provided documents\.?\s*$/i.test(x.answer ?? "")).length;
  const byType: Record<string, number[]> = {};
  for (const x of done) {
    const t = questions.get(x.questionId)?.type ?? "?";
    (byType[t] ??= []).push(x.recallAtK ?? 0);
  }
  return { done: done.length, contains, allFound, idk, byType };
}

const d = reports.map(derived);
const k = reports[0].run.k;
const cols = (fn: (r: Report, i: number) => string) => reports.map(fn).join(" | ");
const judgeNames = [...new Set(reports.flatMap((r) => r.judges.map((j) => j.evaluator)))].sort();
const types = [...new Set(d.flatMap((x) => Object.keys(x.byType)))].sort();

const lines = [
  `| Metric | ${reports.map((r) => `${label(r)} (run \`${r.run.id}\`)`).join(" | ")} |`,
  `|---|${reports.map(() => "---").join("|")}|`,
  `| Questions answered | ${cols((r) => `${r.items.done}/${r.items.total} (${r.items.failed} failed)`)} |`,
  `| **Recall@${k}** (share of evidence sentences in top ${k}) | ${cols((r) => f(r.retrieval.recallAtK))} |`,
  `| All evidence in top ${k} (both hops found) | ${cols((_, i) => `${d[i].allFound}/${d[i].done}`)} |`,
  `| Hit rate@${k} (≥1 evidence sentence) | ${cols((r) => f(r.retrieval.hitRate))} |`,
  `| **MRR@${k}** | ${cols((r) => f(r.retrieval.mrr))} |`,
  ...types.map((t) => `| Recall@${k}, ${t} questions | ${cols((_, i) => `${f(mean(d[i].byType[t] ?? []))} (n=${d[i].byType[t]?.length ?? 0})`)} |`),
  ...judgeNames.map((n) => `| **${n}** mean / pass@0.7 | ${cols((r) => {
    const j = r.judges.find((x) => x.evaluator === n);
    return j ? `${f(j.meanScore)} / ${f(j.passRate)} (${j.judged} judged, ${j.errored} errored)` : "—";
  })} |`),
  `| Answer contains gold answer (normalised) | ${cols((_, i) => `${d[i].contains}/${d[i].done} = ${f(d[i].contains / d[i].done)}`)} |`,
  `| "I don't know" answers | ${cols((_, i) => String(d[i].idk))} |`,
  `| **Request latency p50 / p95** | ${cols((r) => `${f(r.latency.request.p50Ms, 0)} / ${f(r.latency.request.p95Ms, 0)} ms`)} |`,
  `| retrieve step p50 / p95 | ${cols((r) => `${f(r.latency.retrieve.p50Ms, 0)} / ${f(r.latency.retrieve.p95Ms, 0)} ms`)} |`,
  `| Cost per answer (retrieve + generate) | ${cols((r) => `$${f(r.cost.meanPerRequestFromSpansUsd, 6)}`)} |`,
  `| Judge cost per answer | ${cols((r) => `$${f(r.cost.meanJudgePerAnswerUsd, 6)}`)} |`,
  `| **Cost per eval answer incl. judges** | ${cols((r) => `$${f(r.cost.meanPerEvalAnswerUsd, 6)}`)} |`,
  `| Total run cost incl. judges | ${cols((r) => `$${f(r.cost.totalWithJudgesUsd, 4)}`)} |`,
  `| Wall clock, enqueue → all judges settled | ${cols((r) => `${f(r.wallSeconds, 0)} s`)} |`,
];
console.log(lines.join("\n"));

if (reports.length === 2) {
  // Paired per-question view of retrieval: how often each mode wins.
  const [a, b] = reports.map((r) => new Map(r.rows.map((x) => [x.questionId, x])));
  let better = 0, worse = 0, same = 0;
  for (const [id, x] of a) {
    const y = b.get(id);
    if (!y || x.recallAtK === null || y.recallAtK === null) continue;
    if (y.recallAtK > x.recallAtK) better++;
    else if (y.recallAtK < x.recallAtK) worse++;
    else same++;
  }
  console.log(`\nPer question, ${label(reports[1])} vs ${label(reports[0])} recall@${k}: higher on ${better}, lower on ${worse}, equal on ${same}.`);
}
