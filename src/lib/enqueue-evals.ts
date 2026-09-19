import { fromPrisma } from "pg-boss";
import type { Prisma } from "@/generated/prisma/client";
import { getBoss, EVAL_QUEUE, EVAL_DLQ } from "./queue";

// If `Prisma.TransactionClient` doesn't resolve with your generator output, use this
// instead — it derives the type from your own client, so it can't drift with versions:
//   import { db } from "./db";
//   type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

export type EvalJobData = {
  traceId: string;
  evaluatorId: string;
  projectId: string;
};

export async function createEvalRunsAndEnqueue(
  tx: Prisma.TransactionClient,
  traceId: string,
  projectId: string
) {
  const evaluators = await tx.evaluator.findMany({
    where: { projectId, active: true },
    select: { id: true },
  });

  if (evaluators.length === 0) return 0;

  await tx.evalRun.createMany({
    data: evaluators.map((e) => ({
      traceId,
      evaluatorId: e.id,
      status: "queued" as const,
    })),
  });

  const boss = await getBoss();

  for (const e of evaluators) {
    await boss.send(
      EVAL_QUEUE,
      { traceId, evaluatorId: e.id, projectId } satisfies EvalJobData,
      {
        db: fromPrisma(tx),
        retryLimit: 3,
        retryDelay: 2,          // seconds — never leave this at the 0 default
        retryBackoff: true,
        retryDelayMax: 60,      // cap the exponential growth
        expireInSeconds: 120,
        deadLetter: EVAL_DLQ,
      }
    );
  }

  return evaluators.length;
}