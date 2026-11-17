/**
 * Integration tests against a real Postgres with pgvector (DATABASE_URL / DIRECT_URL).
 * Embeddings come from a deterministic feature-hashing embedder so the tests need no
 * API key and produce the same ranking every run. Skipped when no database is set.
 */
import "dotenv/config";
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
import type { EmbeddingProvider, GenerationProvider } from "../providers/types";

const HAS_DB = Boolean(process.env.DATABASE_URL && process.env.DIRECT_URL);
const DIM = 768;

/** Bag-of-words feature hashing → L2-normalised 768-d vector. Lexical, but real cosine. */
function hashEmbed(text: string): number[] {
  const v = new Array(DIM).fill(0);
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    const h = createHash("md5").update(w).digest();
    v[h.readUInt32LE(0) % DIM] += h[4] & 1 ? 1 : -1;
  }
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n);
}

const fakeEmbedder: EmbeddingProvider & { calls: number } = {
  name: "fake", model: "fake-hash-embed", dimensions: DIM, calls: 0,
  async embed(texts) { this.calls++; return texts.map(hashEmbed); },
};

const fakeGenerator: GenerationProvider = {
  name: "fake", model: "fake-gen",
  async generate() {
    return { text: "Jobs retry with jittered exponential backoff [1]. Also see [9].", promptTokens: 400, completionTokens: 20, thoughtsTokens: 0 };
  },
};

const MD = `# Platform

## Retries

Transient failures retry with jittered exponential backoff capped at sixty seconds.

## Tenancy

Cross-tenant requests return 404 so resource existence never leaks.

## Queue

The queue lives in the same Postgres database as the application data.`;

const CSV = `path,purpose
src/lib/errors.ts,classifies upstream errors as transient or permanent
src/lib/pricing.ts,computes cost from token counts and a model price table`;

describe("retrieval over pgvector", { skip: !HAS_DB && "no DATABASE_URL" }, () => {
  // Imported lazily so the suite can be skipped without a database.
  let db: typeof import("../db").db;
  let ingest: typeof import("./documents");
  let retrieval: typeof import("./retrieve");
  let pipeline: typeof import("./pipeline");
  let projectA: string, projectB: string, orgId: string;
  let mdDocId: string;

  before(async () => {
    ({ db } = await import("../db"));
    ingest = await import("./documents");
    retrieval = await import("./retrieve");
    pipeline = await import("./pipeline");
    const { getBoss } = await import("../queue");
    await getBoss();

    const org = await db.organization.create({ data: { name: "rag-test", slug: `rag-test-${Date.now()}` } });
    orgId = org.id;
    projectA = (await db.project.create({ data: { orgId, name: "A" } })).id;
    projectB = (await db.project.create({ data: { orgId, name: "B" } })).id;

    const docs = [
      { projectId: projectA, name: "platform.md", kind: "markdown" as const, content: MD },
      { projectId: projectA, name: "files.csv", kind: "csv" as const, content: CSV },
      // Same text in another project: must never be returned for project A.
      { projectId: projectB, name: "other.md", kind: "markdown" as const, content: MD },
    ];
    for (const d of docs) {
      const doc = await db.document.create({ data: { ...d, sizeBytes: d.content.length, status: "running" } });
      if (d.name === "platform.md") mdDocId = doc.id;
      await ingest.ingestDocument(doc.id, fakeEmbedder);
    }
  });

  after(async () => {
    if (!HAS_DB) return;
    await db.organization.delete({ where: { id: orgId } }); // cascades to projects, chunks, traces
    const { getBoss } = await import("../queue");
    await (await getBoss()).stop({ graceful: false });
    await db.$disconnect();
  });

  test("ingestion stored one chunk per section / row and marked documents ready", async () => {
    const docs = await db.document.findMany({ where: { projectId: projectA }, orderBy: { name: "asc" } });
    assert.deepEqual(docs.map((d) => [d.name, d.status, d.chunkCount]), [
      ["files.csv", "ready", 2],
      ["platform.md", "ready", 3],
    ]);
  });

  test("re-running ingestion replaces chunks instead of duplicating them", async () => {
    await db.document.update({ where: { id: mdDocId }, data: { status: "running" } });
    await ingest.ingestDocument(mdDocId, fakeEmbedder);
    assert.equal(await db.chunk.count({ where: { documentId: mdDocId } }), 3);
  });

  test("top-1 is the lexically matching chunk, scores are descending", async () => {
    const r = await retrieval.retrieve(projectA, "how do transient failures retry with backoff", 3, fakeEmbedder);
    assert.equal(r.chunks.length, 3);
    assert.match(r.chunks[0].content, /jittered exponential backoff/);
    assert.equal(r.chunks[0].documentName, "platform.md");
    const scores = r.chunks.map((c) => c.score);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  });

  test("structured CSV rows are retrievable", async () => {
    const r = await retrieval.retrieve(projectA, "which file classifies errors as transient or permanent", 1, fakeEmbedder);
    assert.match(r.chunks[0].content, /path: src\/lib\/errors\.ts/);
  });

  test("k limits results and retrieval never crosses projects", async () => {
    const r = await retrieval.retrieve(projectA, "postgres queue database", 50, fakeEmbedder);
    assert.equal(r.chunks.length, 5); // 3 markdown + 2 csv in project A, none from B
    const docIds = new Set(r.chunks.map((c) => c.documentId));
    const foreign = await db.chunk.count({ where: { documentId: { in: [...docIds] }, projectId: projectB } });
    assert.equal(foreign, 0);
  });

  test("hybrid: fuses vector and full-text ranks with RRF, scoped to the project", async () => {
    const r = await retrieval.retrieve(projectA, "how do transient failures retry with backoff", 3, fakeEmbedder, "hybrid");
    assert.equal(r.mode, "hybrid");
    assert.equal(r.chunks.length, 3);
    const top = r.chunks[0];
    assert.match(top.content, /jittered exponential backoff/);
    assert.equal(top.vectorRank, 1);
    assert.equal(top.textRank, 1);
    assert.ok(Math.abs(top.rrf! - 2 / (retrieval.RRF_K + 1)) < 1e-9);
    const rrf = r.chunks.map((c) => c.rrf!);
    assert.deepEqual(rrf, [...rrf].sort((a, b) => b - a));

    const all = await retrieval.retrieve(projectA, "postgres queue database", 50, fakeEmbedder, "hybrid");
    assert.equal(all.chunks.length, 5);
    const foreign = await db.chunk.count({ where: { id: { in: all.chunks.map((c) => c.id) }, projectId: projectB } });
    assert.equal(foreign, 0);
  });

  test("hybrid: a stopword-only query falls back to the vector list", async () => {
    const r = await retrieval.retrieve(projectA, "the of and", 2, fakeEmbedder, "hybrid");
    assert.equal(r.chunks.length, 2);
    assert.ok(r.chunks.every((c) => c.textRank === null && c.vectorRank !== null));
  });

  test("pipeline records a trace with retrieve + generate spans, citations, and scoped evals", async () => {
    await db.evaluator.createMany({
      data: [
        { projectId: projectA, name: "rag-only", type: "assertion", config: { rule: "non_empty" }, traceName: "rag.answer" },
        { projectId: projectA, name: "other-only", type: "assertion", config: { rule: "non_empty" }, traceName: "summarize" },
        { projectId: projectA, name: "everything", type: "assertion", config: { rule: "non_empty" } },
      ],
    });

    const res = await pipeline.answerQuestion(projectA, "how do retries back off?", { k: 2 },
      { embedder: fakeEmbedder, generator: fakeGenerator });

    // [9] is out of range for k=2 and is dropped
    assert.deepEqual(res.citations.map((c) => c.n), [1]);
    assert.equal(res.evalsQueued, 2);

    const trace = await db.trace.findUniqueOrThrow({
      where: { id: res.traceId },
      include: { spans: { orderBy: { startedAt: "asc" } }, evalRuns: { include: { evaluator: true } } },
    });
    assert.equal(trace.name, "rag.answer");
    assert.deepEqual(trace.spans.map((s) => s.name), ["retrieve", "generate"]);
    const gen = trace.spans[1];
    assert.equal(gen.promptTokens, 400);
    assert.equal(gen.completionTokens, 20);
    assert.ok((gen.metadata as { tokensPerSec: number }).tokensPerSec > 0);
    assert.deepEqual(trace.evalRuns.map((r) => r.evaluator.name).sort(), ["everything", "rag-only"]);
    assert.match(trace.input, /\[1\] \(source: platform\.md, section "Platform > Retries"\)/);
  });
});
