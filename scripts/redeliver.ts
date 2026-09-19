import "dotenv/config";
import { getBoss, EVAL_QUEUE } from "../src/lib/queue";
import { db } from "../src/lib/db";

async function main() {
  const run = await db.evalRun.findFirst({ orderBy: { createdAt: "desc" } });
  if (!run) throw new Error("no EvalRun found — POST a trace first");

  const trace = await db.trace.findUniqueOrThrow({ where: { id: run.traceId } });
  const boss = await getBoss();

  // Same payload, sent twice — exactly what an at-least-once redelivery looks like.
  for (let i = 0; i < 2; i++) {
    await boss.send(EVAL_QUEUE, {
      traceId: run.traceId,
      evaluatorId: run.evaluatorId,
      projectId: trace.projectId,
    });
  }
  console.log("sent 2 duplicate jobs for", run.traceId, run.evaluatorId);
}

main().finally(() => process.exit(0));