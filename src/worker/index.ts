import "dotenv/config";
import {
  getBoss, EVAL_QUEUE, EVAL_DLQ, INGEST_QUEUE, INGEST_DLQ, RAG_EVAL_QUEUE, RAG_EVAL_DLQ,
} from "../lib/queue";
import { db } from "../lib/db";
import type { EvalJobData } from "../lib/enqueue-evals";
import { getEvaluator } from "../lib/evaluators";
import { log } from "../lib/logger";
import type { IngestJobData } from "../lib/rag/documents";
import type { RagEvalJobData } from "../lib/rag/eval";
import {
  handleIngestJob, handleIngestDeadLetter, handleRagEvalJob, handleRagEvalDeadLetter,
} from "../lib/rag/jobs";


import { classify, TransientError, PermanentError } from "../lib/errors";

async function handleJob(data: EvalJobData) {
  const { traceId, evaluatorId } = data;

  const claimed = await db.evalRun.updateManyAndReturn({
    where: { traceId, evaluatorId, status: { in: ["queued", "running"] } },
    data: { status: "running", attempts: { increment: 1 } },
  });

  if (claimed.length === 0) {
    log.info("eval.skipped", { traceId, evaluatorId, reason: "already_settled" });
    return;
  }

  const attempt = claimed[0].attempts;
  const startedAt = Date.now();

  try {
    const { result, evaluatorName } = await runEvaluator(traceId, evaluatorId);
    const durationMs = Date.now() - startedAt;

    await db.evalRun.updateMany({
      where: { traceId, evaluatorId, status: "running" },
      data: { status: "done", ...result, error: null },
    });

    log.info("eval.done", {
      traceId, evaluatorId, evaluator: evaluatorName,
      score: result.score, passed: result.passed, attempt, durationMs,
    });
  } catch (raw) {
    const err = classify(raw);
    const durationMs = Date.now() - startedAt;

    if (err instanceof PermanentError) {
      await db.evalRun.updateMany({
        where: { traceId, evaluatorId, status: "running" },
        data: { status: "failed", error: `permanent: ${err.message}` },
      });
      log.warn("eval.permanent_fail", { traceId, evaluatorId, attempt, durationMs, error: err.message });
      return;
    }

    log.warn("eval.transient", { traceId, evaluatorId, attempt, durationMs, error: err.message });
    throw err;
  }
}

async function runEvaluator(traceId: string, evaluatorId: string) {
  const trace = await db.trace.findUnique({ where: { id: traceId } });
  if (!trace) throw new PermanentError(`trace ${traceId} not found`);

  const evaluator = await db.evaluator.findUnique({ where: { id: evaluatorId } });
  if (!evaluator) throw new PermanentError(`evaluator ${evaluatorId} not found`);

  const impl = getEvaluator(evaluator.type);
  if (!impl) throw new PermanentError(`no implementation for type ${evaluator.type}`);

  const config = impl.configSchema.safeParse(evaluator.config);
  if (!config.success) {
    throw new PermanentError(`invalid config: ${config.error.message}`);
  }

  const result = await impl.run(
    { input: trace.input, output: trace.output, model: trace.model, metadata: trace.metadata },
    config.data as never
  );

  return { result, evaluatorName: evaluator.name };
}

async function main() {
  const boss = await getBoss();

await boss.work<EvalJobData>(
  EVAL_QUEUE,
  { batchSize: 1, pollingIntervalSeconds: 2 },
  async (jobs) => {
    await handleJob(jobs[0].data);
  }
);


await boss.work<EvalJobData>(EVAL_DLQ, { batchSize: 1 }, async (jobs) => {
    const { traceId, evaluatorId } = jobs[0].data;

    await db.evalRun.updateMany({
      where: { traceId, evaluatorId, status: { in: ["queued", "running"] } },
      data: { status: "failed", error: "exhausted retries (dead-lettered)" },
    });

        log.error("eval.dead_lettered", { traceId, evaluatorId });
  });

  // RAG queues — batchSize 1 for the same failure-isolation reason as eval-run.
  await boss.work<IngestJobData>(INGEST_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs) => handleIngestJob(jobs[0].data));
  await boss.work<IngestJobData>(INGEST_DLQ, { batchSize: 1 },
    async (jobs) => handleIngestDeadLetter(jobs[0].data));
  await boss.work<RagEvalJobData>(RAG_EVAL_QUEUE, { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs) => handleRagEvalJob(jobs[0].data));
  await boss.work<RagEvalJobData>(RAG_EVAL_DLQ, { batchSize: 1 },
    async (jobs) => handleRagEvalDeadLetter(jobs[0].data));

  console.log(`[worker] listening on "${EVAL_QUEUE}" and "${EVAL_DLQ}"`);
  console.log(`[worker] listening on "${INGEST_QUEUE}" and "${RAG_EVAL_QUEUE}" (+ dead-letter queues)`);

  console.log(`[worker] listening on "${EVAL_QUEUE}"`);

  // Hosts like Cloud Run require every service to answer HTTP on $PORT. The worker has no
  // API, so it serves a bare health check there; locally (no PORT) nothing is opened.
  if (process.env.PORT) {
    const { createServer } = await import("http");
    createServer((_req, res) => res.writeHead(200, { "content-type": "text/plain" }).end("ok"))
      .listen(Number(process.env.PORT), () => console.log(`[worker] health check on :${process.env.PORT}`));
  }
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});