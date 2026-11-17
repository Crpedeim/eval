/**
 * Prepare a benchmark project: create it (or reuse it by name) in an existing organization,
 * add the two RAG judges, upload a corpus directory through the same transactional
 * enqueue the upload API uses, and wait for the worker to chunk + embed every file.
 *
 *   npx tsx scripts/rag-bench-setup.ts <orgSlug> <projectName> datasets/rag/hotpotqa/corpus
 *
 * Prints the project id to pass to scripts/rag-eval.ts. The worker must be running.
 */
import "dotenv/config";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { db } from "../src/lib/db";
import { getBoss } from "../src/lib/queue";
import { createDocumentAndEnqueue, kindFromFilename } from "../src/lib/rag/documents";
import { RAG_TRACE_NAME } from "../src/lib/rag/pipeline";
import { FAITHFULNESS_RUBRIC, RELEVANCE_RUBRIC } from "../src/lib/rag/judges";

async function main() {
  const [orgSlug, projectName, corpusDir] = process.argv.slice(2);
  if (!orgSlug || !projectName || !corpusDir) throw new Error("usage: rag-bench-setup.ts <orgSlug> <projectName> <corpusDir>");

  const org = await db.organization.findUniqueOrThrow({ where: { slug: orgSlug } });
  const project =
    (await db.project.findFirst({ where: { orgId: org.id, name: projectName } })) ??
    (await db.project.create({ data: { orgId: org.id, name: projectName } }));
  console.log(`project ${project.id} (${projectName}) in org ${orgSlug}`);

  for (const [name, rubric] of [["rag-faithfulness", FAITHFULNESS_RUBRIC], ["rag-answer-relevance", RELEVANCE_RUBRIC]]) {
    const data = { type: "llm_judge" as const, config: { rubric, threshold: 0.7 }, traceName: RAG_TRACE_NAME, active: true };
    const existing = await db.evaluator.findFirst({ where: { projectId: project.id, name } });
    if (existing) await db.evaluator.update({ where: { id: existing.id }, data });
    else await db.evaluator.create({ data: { projectId: project.id, name, ...data } });
  }

  const have = new Set((await db.document.findMany({ where: { projectId: project.id }, select: { name: true } })).map((d) => d.name));
  await getBoss();
  const started = Date.now();
  for (const name of readdirSync(corpusDir).sort()) {
    const kind = kindFromFilename(name);
    if (!kind || have.has(name)) continue;
    const buf = readFileSync(join(corpusDir, name));
    await db.$transaction((tx) =>
      createDocumentAndEnqueue(tx, project.id, {
        name, kind, sizeBytes: buf.length,
        ...(kind === "pdf" ? { bytes: new Uint8Array(buf) } : { content: buf.toString("utf8") }),
      })
    );
    console.log(`queued ${name} (${buf.length} bytes)`);
  }

  for (;;) {
    const docs = await db.document.findMany({ where: { projectId: project.id }, orderBy: { name: "asc" } });
    const pending = docs.filter((d) => d.status === "queued" || d.status === "running");
    if (!pending.length) {
      for (const d of docs) console.log(`${d.name}: ${d.status} chunks=${d.chunkCount} attempts=${d.attempts} ${JSON.stringify(d.stats)}${d.error ? ` error=${d.error}` : ""}`);
      console.log(`settled in ${((Date.now() - started) / 1000).toFixed(1)}s; ${docs.reduce((a, d) => a + d.chunkCount, 0)} chunks`);
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  console.log(`PROJECT_ID=${project.id}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await (await getBoss()).stop({ graceful: false }); await db.$disconnect(); process.exit(); });
