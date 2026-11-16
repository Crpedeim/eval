import { PgBoss } from "pg-boss";

export const EVAL_QUEUE = "eval-run";
export const EVAL_DLQ = "eval-run-dead";
export const INGEST_QUEUE = "ingest-document";
export const INGEST_DLQ = "ingest-document-dead";
export const RAG_EVAL_QUEUE = "rag-eval-item";
export const RAG_EVAL_DLQ = "rag-eval-item-dead";

const g = globalThis as unknown as { bossPromise?: Promise<PgBoss> };

export function getBoss(): Promise<PgBoss> {
  if (!g.bossPromise) {
    g.bossPromise = (async () => {
      const boss = new PgBoss({
        connectionString: process.env.DIRECT_URL!,
        schema: "pgboss",
        max: 3,
      });
      boss.on("error", (err) => console.error("[pg-boss]", err));
      await boss.start();
      for (const q of [EVAL_DLQ, EVAL_QUEUE, INGEST_DLQ, INGEST_QUEUE, RAG_EVAL_DLQ, RAG_EVAL_QUEUE]) {
        await boss.createQueue(q);
      }
      return boss;
    })();
  }
  return g.bossPromise;
}

// why a cached promise explain??