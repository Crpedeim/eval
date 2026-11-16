/**
 * Offline label check: chunk the corpus exactly as the worker would and confirm every
 * evidence span lands inside at least one chunk. A span that doesn't is a labelling error
 * (or split across a chunk boundary) and would cap recall regardless of the embedder.
 *
 *   npx tsx scripts/rag-check-dataset.ts datasets/rag/questions.json datasets/rag/corpus
 */
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import { extractChunks, kindFromFilename } from "../src/lib/rag/documents";
import { RagDataset } from "../src/lib/rag/eval";
import { matchedEvidence } from "../src/lib/rag/metrics";

async function main() {
  const [datasetPath, corpusDir] = process.argv.slice(2);
  const dataset = RagDataset.parse(JSON.parse(readFileSync(datasetPath, "utf8")));

  const chunks: { doc: string; content: string }[] = [];
  for (const name of readdirSync(corpusDir).sort()) {
    const kind = kindFromFilename(name);
    if (!kind) continue;
    const buf = readFileSync(join(corpusDir, name));
    const r = await extractChunks({
      name, kind,
      content: kind === "pdf" ? null : buf.toString("utf8"),
      bytes: kind === "pdf" ? new Uint8Array(buf) : null,
    });
    console.log(`${name}: kind=${kind} bytes=${buf.length} chars=${r.chars}${r.pages ? ` pages=${r.pages}` : ""} chunks=${r.chunks.length}`);
    chunks.push(...r.chunks.map((c) => ({ doc: name, content: c.content })));
  }

  let missing = 0, spans = 0;
  for (const q of dataset.questions) {
    q.evidence.forEach((e, i) => {
      spans++;
      const hits = chunks.filter((c) => matchedEvidence(c.content, [e]).length);
      if (!hits.length) {
        missing++;
        console.log(`MISSING ${q.id}[${i}]: ${e}`);
      } else if (q.source && !hits.some((h) => h.doc === q.source)) {
        console.log(`WRONG SOURCE ${q.id}: found only in ${hits.map((h) => h.doc).join(", ")}`);
      }
    });
  }
  console.log(`\n${dataset.questions.length} questions, ${spans} evidence spans, ${chunks.length} chunks, ${missing} spans not found in any chunk`);
  process.exit(missing ? 1 : 0);
}

main();
