/**
 * Worker handlers for the RAG queues. Same contract as the eval-run handler:
 * claim with a conditional update (redelivery of a settled row is a no-op), settle
 * permanent failures and return, rethrow transient ones so pg-boss retries with backoff.
 */
import { db } from "../db";
import { log } from "../logger";
import { classify, PermanentError } from "../errors";
import { ingestDocument, type IngestJobData } from "./documents";
import { evaluateItem, type RagEvalJobData } from "./eval";

export async function handleIngestJob(data: IngestJobData) {
  const { documentId } = data;
  const claimed = await db.document.updateManyAndReturn({
    where: { id: documentId, status: { in: ["queued", "running"] } },
    data: { status: "running", attempts: { increment: 1 } },
    select: { attempts: true, name: true },
  });
  if (claimed.length === 0) {
    log.info("ingest.skipped", { documentId, reason: "already_settled" });
    return;
  }
  const { attempts: attempt, name } = claimed[0];
  const startedAt = Date.now();

  try {
    const stats = await ingestDocument(documentId);
    log.info("ingest.done", { documentId, name, attempt, durationMs: Date.now() - startedAt, ...stats });
  } catch (raw) {
    const err = classify(raw);
    const durationMs = Date.now() - startedAt;
    if (err instanceof PermanentError) {
      await db.document.updateMany({
        where: { id: documentId, status: "running" },
        data: { status: "failed", error: `permanent: ${err.message}` },
      });
      log.warn("ingest.permanent_fail", { documentId, attempt, durationMs, error: err.message });
      return;
    }
    log.warn("ingest.transient", { documentId, attempt, durationMs, error: err.message });
    throw err;
  }
}

export async function handleIngestDeadLetter(data: IngestJobData) {
  await db.document.updateMany({
    where: { id: data.documentId, status: { in: ["queued", "running"] } },
    data: { status: "failed", error: "exhausted retries (dead-lettered)" },
  });
  log.error("ingest.dead_lettered", { documentId: data.documentId });
}

export async function handleRagEvalJob(data: RagEvalJobData) {
  const { itemId } = data;
  const claimed = await db.ragEvalItem.updateManyAndReturn({
    where: { id: itemId, status: { in: ["queued", "running"] } },
    data: { status: "running", attempts: { increment: 1 } },
    select: { attempts: true, questionId: true },
  });
  if (claimed.length === 0) {
    log.info("rag_eval.skipped", { itemId, reason: "already_settled" });
    return;
  }
  const { attempts: attempt, questionId } = claimed[0];
  const startedAt = Date.now();

  try {
    const r = await evaluateItem(itemId);
    log.info("rag_eval.done", {
      itemId, questionId, attempt, traceId: r.traceId,
      latencyMs: r.latencyMs, costUsd: r.costUsd, citations: r.citations.length, evalsQueued: r.evalsQueued,
    });
  } catch (raw) {
    const err = classify(raw);
    const durationMs = Date.now() - startedAt;
    if (err instanceof PermanentError) {
      await db.ragEvalItem.updateMany({
        where: { id: itemId, status: "running" },
        data: { status: "failed", error: `permanent: ${err.message}` },
      });
      log.warn("rag_eval.permanent_fail", { itemId, attempt, durationMs, error: err.message });
      return;
    }
    log.warn("rag_eval.transient", { itemId, attempt, durationMs, error: err.message });
    throw err;
  }
}

export async function handleRagEvalDeadLetter(data: RagEvalJobData) {
  await db.ragEvalItem.updateMany({
    where: { id: data.itemId, status: { in: ["queued", "running"] } },
    data: { status: "failed", error: "exhausted retries (dead-lettered)" },
  });
  log.error("rag_eval.dead_lettered", { itemId: data.itemId });
}
