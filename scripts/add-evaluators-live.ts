/**
 * Add the two generic evaluators (an assertion and an LLM judge, both unscoped) to one
 * project, idempotently. Used to verify the live worker on a fresh project.
 *
 *   npx tsx scripts/add-evaluators-live.ts <projectId>
 */
import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const projectId = process.argv[2];
  if (!projectId) throw new Error("usage: add-evaluators-live.ts <projectId>");
  await db.project.findUniqueOrThrow({ where: { id: projectId } });
  const evaluators = [
    { name: "output-not-empty", type: "assertion" as const, config: { rule: "non_empty" } },
    {
      name: "helpfulness-judge", type: "llm_judge" as const,
      config: { rubric: "Rate how helpful and accurate the output is given the input.", threshold: 0.7 },
    },
  ];
  for (const e of evaluators) {
    const existing = await db.evaluator.findFirst({ where: { projectId, name: e.name } });
    if (existing) console.log(`exists: ${e.name}`);
    else { await db.evaluator.create({ data: { projectId, ...e, active: true } }); console.log(`created: ${e.name}`); }
  }
}

main().finally(() => db.$disconnect());
