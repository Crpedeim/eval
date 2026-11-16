/**
 * Negative control for the RAG judges: if faithfulness/relevance score every real answer
 * 1.0, are they discriminating at all? Re-judge real eval traces with deliberately bad
 * outputs, using the exact evaluator configs stored on the project.
 *
 *   npx tsx scripts/rag-judge-control.ts <ragEvalRunId> [n=10]
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "fs";
import { db } from "../src/lib/db";
import { llmJudgeEvaluator } from "../src/lib/evaluators/llm-judge";
import { mean } from "../src/lib/rag/metrics";

const FABRICATED =
  " It was also benchmarked at 50,000 requests per second on a single Raspberry Pi in 2019 [1].";
const REFUSAL = "I don't know based on the provided documents.";

async function main() {
  const [runId, nArg] = process.argv.slice(2);
  const n = Number(nArg ?? 10);
  const run = await db.ragEvalRun.findUniqueOrThrow({ where: { id: runId } });
  const judges = await db.evaluator.findMany({
    where: { projectId: run.projectId, name: { in: ["rag-faithfulness", "rag-answer-relevance"] } },
  });
  const items = await db.ragEvalItem.findMany({
    where: { runId, status: "done" },
    include: { trace: true },
    orderBy: { questionId: "asc" },
  });
  // Every 3rd item, so all three sources (README, CSV, PDF) are represented.
  const sample = items.filter((_, i) => i % Math.max(1, Math.floor(items.length / n)) === 0).slice(0, n);

  const variants = (i: number) => {
    const t = sample[i].trace!;
    const other = sample[(i + Math.floor(sample.length / 2)) % sample.length].trace!;
    return {
      original: t.output,
      swapped: other.output,
      fabricated: t.output.trimEnd() + FABRICATED,
      refusal: REFUSAL,
    } as Record<string, string>;
  };

  type Row = { questionId: string; variant: string; judge: string; score: number; reasoning: string };
  const rows: Row[] = [];
  const tasks: (() => Promise<void>)[] = [];
  sample.forEach((item, i) => {
    for (const [variant, output] of Object.entries(variants(i))) {
      for (const j of judges) {
        tasks.push(async () => {
          const config = llmJudgeEvaluator.configSchema.parse(j.config);
          const r = await llmJudgeEvaluator.run(
            { input: item.trace!.input, output, model: item.trace!.model, metadata: null }, config
          );
          rows.push({ questionId: item.questionId, variant, judge: j.name, score: r.score, reasoning: r.reasoning });
        });
      }
    }
  });
  for (let i = 0; i < tasks.length; i += 6) await Promise.all(tasks.slice(i, i + 6).map((t) => t()));

  const summary: Record<string, Record<string, number | null>> = {};
  for (const v of ["original", "swapped", "fabricated", "refusal"]) {
    summary[v] = {};
    for (const j of judges) {
      summary[v][j.name] = mean(rows.filter((r) => r.variant === v && r.judge === j.name).map((r) => r.score));
    }
  }
  console.log(`judge calls: ${rows.length} over ${sample.length} questions (${sample.map((s) => s.questionId).join(", ")})`);
  console.table(summary);

  mkdirSync("datasets/rag/results", { recursive: true });
  const out = `datasets/rag/results/judge-negative-control-${runId}.json`;
  writeFileSync(out, JSON.stringify({ runId, judgeModel: process.env.JUDGE_MODEL, sample: sample.map((s) => s.questionId), summary, rows }, null, 2));
  console.log(`wrote ${out}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => { await db.$disconnect(); process.exit(); });
