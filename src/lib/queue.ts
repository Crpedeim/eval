import { PgBoss } from "pg-boss";

export const EVAL_QUEUE = "eval-run";
export const EVAL_DLQ = "eval-run-dead";

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
      await boss.createQueue(EVAL_QUEUE);
      await boss.createQueue(EVAL_DLQ);
      return boss;
    })();
  }
  return g.bossPromise;
}

// why a cached promise explain??