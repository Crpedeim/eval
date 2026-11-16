import { randomUUID } from "crypto";
import { fromPrisma } from "pg-boss";
import { Prisma } from "@/generated/prisma/client";
import type { DocumentKind } from "@/generated/prisma/client";
import { db } from "../db";
import { getBoss, INGEST_QUEUE, INGEST_DLQ } from "../queue";
import { PermanentError } from "../errors";
import { getEmbeddingProvider } from "../providers";
import type { EmbeddingProvider } from "../providers/types";
import {
  chunkCsv, chunkMarkdown, chunkPages, chunkPlainText,
  DEFAULT_CHUNK_OPTIONS, type ChunkDraft, type ChunkOptions,
} from "./chunking";
import { estimateTokens } from "./metrics";
import { toVectorLiteral } from "./vector";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export type IngestJobData = { documentId: string; projectId: string };

export type DocumentUpload = {
  name: string;
  kind: DocumentKind;
  content?: string;
  bytes?: Uint8Array<ArrayBuffer>;
  sizeBytes: number;
};

export class UploadError extends Error {}

export function kindFromFilename(name: string, mime = ""): DocumentKind | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (["md", "markdown", "mdx"].includes(ext) || mime === "text/markdown") return "markdown";
  if (ext === "csv" || mime === "text/csv") return "csv";
  if (ext === "pdf" || mime === "application/pdf") return "pdf";
  if (ext === "txt" || mime.startsWith("text/")) return "text";
  return null;
}

/** Validate an uploaded File (from multipart form data) into a storable document. */
export async function documentFromFile(file: File, nameOverride?: string): Promise<DocumentUpload> {
  const name = (nameOverride || file.name || "").trim();
  if (!name) throw new UploadError("file needs a name");
  if (file.size === 0) throw new UploadError("file is empty");
  if (file.size > MAX_DOCUMENT_BYTES) throw new UploadError(`file exceeds ${MAX_DOCUMENT_BYTES} bytes`);

  const kind = kindFromFilename(name, file.type);
  if (!kind) throw new UploadError("unsupported type: use .md, .txt, .csv or .pdf");

  if (kind === "pdf") {
    const bytes = new Uint8Array(await file.arrayBuffer());
    return { name, kind, bytes, sizeBytes: file.size };
  }
  return { name, kind, content: await file.text(), sizeBytes: file.size };
}

/**
 * Store the document and enqueue its ingestion job in the caller's transaction — the same
 * transactional-enqueue guarantee traces have: no document without a job, no orphan job.
 */
export async function createDocumentAndEnqueue(
  tx: Prisma.TransactionClient,
  projectId: string,
  upload: DocumentUpload
) {
  const doc = await tx.document.create({
    data: {
      projectId,
      name: upload.name,
      kind: upload.kind,
      content: upload.content,
      bytes: upload.bytes,
      sizeBytes: upload.sizeBytes,
    },
    select: { id: true, name: true, kind: true, status: true },
  });

  const boss = await getBoss();
  await boss.send(INGEST_QUEUE, { documentId: doc.id, projectId } satisfies IngestJobData, {
    db: fromPrisma(tx),
    retryLimit: 5,
    retryDelay: 2,
    retryBackoff: true,
    retryDelayMax: 60,
    expireInSeconds: 600,
    deadLetter: INGEST_DLQ,
  });
  return doc;
}

/** Parse + chunk a stored document. Pure apart from PDF decoding. */
export async function extractChunks(
  doc: { name: string; kind: DocumentKind; content: string | null; bytes: Uint8Array | null },
  opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS
): Promise<{ chunks: ChunkDraft[]; chars: number; pages?: number }> {
  switch (doc.kind) {
    case "markdown": {
      const text = doc.content ?? "";
      return { chunks: chunkMarkdown(text, opts), chars: text.length };
    }
    case "text": {
      const text = doc.content ?? "";
      return { chunks: chunkPlainText(text, opts), chars: text.length };
    }
    case "csv": {
      const text = doc.content ?? "";
      try {
        return { chunks: chunkCsv(text, doc.name, opts), chars: text.length };
      } catch (e) {
        throw new PermanentError(`csv parse failed: ${(e as Error).message}`);
      }
    }
    case "pdf": {
      if (!doc.bytes) throw new PermanentError("pdf document has no bytes");
      const { extractText } = await import("unpdf");
      let pages: string[];
      try {
        // Copy: pdf.js may transfer (detach) the buffer it is given.
        ({ text: pages } = await extractText(new Uint8Array(doc.bytes), { mergePages: false }));
      } catch (e) {
        throw new PermanentError(`pdf parse failed: ${(e as Error).message}`);
      }
      return {
        chunks: chunkPages(pages, opts),
        chars: pages.reduce((a, p) => a + p.length, 0),
        pages: pages.length,
      };
    }
  }
}

export type IngestStats = {
  chars: number;
  pages?: number;
  chunks: number;
  avgChunkChars: number;
  parseMs: number;
  embedMs: number;
  writeMs: number;
  embedModel: string;
  embedTokensEst: number;
};

/**
 * The ingestion job body: parse → chunk → embed → replace this document's chunks.
 * Delete-then-insert inside one transaction makes a retried job idempotent: a rerun
 * after a crash replaces the chunks rather than duplicating them.
 * Caller must already have claimed the document (status = running).
 */
export async function ingestDocument(
  documentId: string,
  embedder: EmbeddingProvider = getEmbeddingProvider(),
  opts: ChunkOptions = DEFAULT_CHUNK_OPTIONS
): Promise<IngestStats> {
  const doc = await db.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new PermanentError(`document ${documentId} not found`);

  const t0 = performance.now();
  const { chunks, chars, pages } = await extractChunks(doc, opts);
  const parseMs = performance.now() - t0;
  if (chunks.length === 0) throw new PermanentError("document produced no chunks");

  const t1 = performance.now();
  const vectors = await embedder.embed(chunks.map((c) => c.content), "document");
  const embedMs = performance.now() - t1;
  if (vectors.length !== chunks.length) {
    throw new PermanentError(`embedder returned ${vectors.length} vectors for ${chunks.length} chunks`);
  }

  const stats: IngestStats = {
    chars,
    ...(pages !== undefined ? { pages } : {}),
    chunks: chunks.length,
    avgChunkChars: Math.round(chunks.reduce((a, c) => a + c.content.length, 0) / chunks.length),
    parseMs: Math.round(parseMs),
    embedMs: Math.round(embedMs),
    writeMs: 0,
    embedModel: embedder.model,
    embedTokensEst: chunks.reduce((a, c) => a + estimateTokens(c.content), 0),
  };

  const t2 = performance.now();
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`delete from "Chunk" where "documentId" = ${documentId}`;
    for (let i = 0; i < chunks.length; i += 100) {
      const rows = chunks.slice(i, i + 100).map((c, j) => Prisma.sql`(
        ${randomUUID()}, ${documentId}, ${doc.projectId}, ${i + j}, ${c.content},
        ${JSON.stringify(c.metadata)}::jsonb, ${toVectorLiteral(vectors[i + j], embedder.dimensions)}::vector
      )`);
      await tx.$executeRaw`
        insert into "Chunk" (id, "documentId", "projectId", idx, content, metadata, embedding)
        values ${Prisma.join(rows)}`;
    }
    stats.writeMs = Math.round(performance.now() - t2);
    await tx.document.updateMany({
      where: { id: documentId, status: "running" },
      data: { status: "ready", chunkCount: chunks.length, error: null, stats },
    });
  });

  return stats;
}
