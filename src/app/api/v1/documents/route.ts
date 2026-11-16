import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/authenticate-request";
import { getBoss } from "@/lib/queue";
import {
  createDocumentAndEnqueue, documentFromFile, kindFromFilename,
  MAX_DOCUMENT_BYTES, UploadError, type DocumentUpload,
} from "@/lib/rag/documents";

const JsonDocument = z.object({
  name: z.string().min(1),
  content: z.string().min(1),
});

/**
 * Upload a document for RAG. Either multipart/form-data with a `file` field (md, txt,
 * csv, pdf) or JSON `{ name, content }` for text formats. Stores it and enqueues the
 * ingestion job in one transaction; chunking and embedding happen on the worker.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  let upload: DocumentUpload;
  try {
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) throw new UploadError("missing `file` field");
      const name = form.get("name");
      upload = await documentFromFile(file, typeof name === "string" ? name : undefined);
    } else {
      const parsed = JsonDocument.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return NextResponse.json({ error: "validation failed", details: parsed.error.flatten() }, { status: 422 });
      }
      const { name, content } = parsed.data;
      const kind = kindFromFilename(name);
      if (!kind || kind === "pdf") throw new UploadError("JSON uploads take .md, .txt or .csv names; send PDFs as multipart");
      const sizeBytes = Buffer.byteLength(content);
      if (sizeBytes > MAX_DOCUMENT_BYTES) throw new UploadError(`content exceeds ${MAX_DOCUMENT_BYTES} bytes`);
      upload = { name, kind, content, sizeBytes };
    }
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }

  await getBoss(); // resolve before opening the transaction
  const doc = await db.$transaction((tx) => createDocumentAndEnqueue(tx, auth.project.id, upload));
  return NextResponse.json(doc, { status: 202 });
}
