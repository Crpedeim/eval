/** Print one eval run's progress (read-only): npx tsx scripts/rag-eval-status.ts <runId> */
import "dotenv/config";
import { db } from "../src/lib/db";
import { ragEvalReport } from "../src/lib/rag/report";

async function main() {
  const r = await ragEvalReport(process.argv[2]);
  if (!r) throw new Error("no such run");
  console.log(JSON.stringify({ items: r.items, judges: r.judges.map((j) => ({ name: j.evaluator, judged: j.judged, pending: j.pending, errored: j.errored })) }));
}
main().finally(() => db.$disconnect());
