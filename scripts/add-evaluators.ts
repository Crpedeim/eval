import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

const HELPFULNESS_RUBRIC =
  "Does the output accurately and concisely summarize the input? " +
  "Penalize factual errors and omissions of key points. " +
  "Do not reward or penalize length.";

async function upsertEvaluator(
  projectId: string,
  name: string,
  data: { type: "assertion" | "llm_judge"; config: object; active?: boolean }
) {
  const existing = await db.evaluator.findFirst({ where: { projectId, name } });
  if (existing) {
    await db.evaluator.update({
      where: { id: existing.id },
      data: { type: data.type, config: data.config, active: data.active ?? true },
    });
    console.log(`updated: ${name}`);
  } else {
    await db.evaluator.create({
      data: { projectId, name, type: data.type, config: data.config, active: data.active ?? true },
    });
    console.log(`created: ${name}`);
  }
}

async function main() {
  const org = await db.organization.findUniqueOrThrow({ where: { slug: "bizz" } });
  const project = await db.project.findFirstOrThrow({ where: { orgId: org.id, name: "Default" } });

  await upsertEvaluator(project.id, "output-not-empty", {
    type: "assertion",
    config: { rule: "non_empty" },
  });

  await upsertEvaluator(project.id, "under-2000-chars", {
    type: "assertion",
    config: { rule: "max_length", limit: 2000 },
  });

  await upsertEvaluator(project.id, "helpfulness-judge", {
    type: "llm_judge",
    config: { rubric: HELPFULNESS_RUBRIC, threshold: 0.7 },
  });

  const all = await db.evaluator.findMany({
    where: { projectId: project.id },
    select: { name: true, type: true, active: true, config: true },
  });
  console.log("\nevaluators on project", project.id);
  console.table(all.map((e) => ({ ...e, config: JSON.stringify(e.config) })));
}

main().finally(() => db.$disconnect());