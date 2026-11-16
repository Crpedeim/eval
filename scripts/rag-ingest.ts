/**
 * Upload files through the real ingestion API and wait for the worker to finish them.
 *
 *   BASE_URL=http://localhost:3000 API_KEY=evp_live_... \
 *     npx tsx scripts/rag-ingest.ts datasets/rag/corpus/*
 */
import { readFileSync } from "fs";
import { basename } from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const KEY = process.env.API_KEY;

type Doc = { id: string; name: string; status: string; chunkCount: number; error: string | null; stats: Record<string, unknown> | null; sizeBytes: number };

async function main() {
  if (!KEY) throw new Error("set API_KEY");
  const files = process.argv.slice(2);
  const started = Date.now();
  const ids: string[] = [];

  for (const path of files) {
    const form = new FormData();
    form.set("file", new Blob([readFileSync(path)]), basename(path));
    const res = await fetch(`${BASE}/api/v1/documents`, {
      method: "POST", headers: { authorization: `Bearer ${KEY}` }, body: form,
    });
    const body = await res.json();
    console.log(`POST ${basename(path)} → ${res.status}`, body);
    if (res.status !== 202) process.exit(1);
    ids.push(body.id);
  }

  const pending = new Set(ids);
  const done: Doc[] = [];
  while (pending.size) {
    await new Promise((r) => setTimeout(r, 1000));
    for (const id of [...pending]) {
      const res = await fetch(`${BASE}/api/v1/documents/${id}`, { headers: { authorization: `Bearer ${KEY}` } });
      const d = (await res.json()) as Doc;
      if (d.status === "ready" || d.status === "failed") {
        pending.delete(id);
        done.push(d);
      }
    }
    if (Date.now() - started > 600_000) throw new Error("timed out waiting for ingestion");
  }

  console.table(done.map((d) => ({
    name: d.name, status: d.status, bytes: d.sizeBytes, chunks: d.chunkCount,
    chars: d.stats?.chars, avgChunkChars: d.stats?.avgChunkChars, parseMs: d.stats?.parseMs,
    embedMs: d.stats?.embedMs, writeMs: d.stats?.writeMs, error: d.error,
  })));
  console.log(`all documents settled ${((Date.now() - started) / 1000).toFixed(1)}s after first upload`);
}

main().catch((e) => { console.error(e); process.exit(1); });
