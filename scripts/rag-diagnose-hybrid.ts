/**
 * For eval items where hybrid recall < vector recall, show where the labelled evidence
 * chunks rank in the vector list and the full-text list, and how many full-text matches
 * there were. Read-only.
 *
 *   npx tsx scripts/rag-diagnose-hybrid.ts <vectorRunId> <hybridRunId> [limit=5]
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { matchedEvidence } from "../src/lib/rag/metrics";

async function main() {
  const [vecRun, hybRun, lim] = process.argv.slice(2);
  const [vec, hyb] = await Promise.all([vecRun, hybRun].map((id) => db.ragEvalItem.findMany({ where: { runId: id } })));
  const v = new Map(vec.map((i) => [i.questionId, i]));
  const worse = hyb.filter((h) => (h.recallAtK ?? 0) < (v.get(h.questionId)?.recallAtK ?? 0));
  const run = await db.ragEvalRun.findUniqueOrThrow({ where: { id: hybRun } });
  let textRankOfGold: (number | null)[] = [];
  for (const h of worse.slice(0, Number(lim ?? 5))) {
    const evidence = h.evidence as string[];
    const ranked = await db.$queryRaw<{ id: string; content: string; rank: number }[]>`
      with q as (select replace(plainto_tsquery('english', ${h.question})::text, '&', '|')::tsquery as query)
      select c.id, c.content, row_number() over (order by ts_rank_cd(to_tsvector('english', c.content), q.query) desc, c.id)::int as rank
      from "Chunk" c, q where c."projectId" = ${run.projectId} and to_tsvector('english', c.content) @@ q.query
      order by rank`;
    const gold = ranked.filter((r) => matchedEvidence(r.content, evidence).length).map((r) => r.rank);
    const trace = h.traceId ? await db.trace.findUnique({ where: { id: h.traceId }, include: { spans: true } }) : null;
    const meta = trace?.spans.find((s) => s.name === "retrieve")?.metadata as { vectorRanks?: number[]; textRanks?: number[] } | undefined;
    textRankOfGold = textRankOfGold.concat(gold.length ? gold : [null]);
    console.log(JSON.stringify({
      q: h.question.slice(0, 90), vectorRecall: v.get(h.questionId)?.recallAtK, hybridRecall: h.recallAtK,
      ftsMatches: ranked.length, goldChunkFtsRanks: gold,
      top5VectorRanks: meta?.vectorRanks, top5TextRanks: meta?.textRanks,
    }));
  }
  console.log(`${worse.length} questions worse with hybrid`);
}
main().finally(() => db.$disconnect());
