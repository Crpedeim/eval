/**
 * Upsert the two RAG judges on a project. Both are ordinary `llm_judge` evaluators run
 * by the existing worker; `traceName` scopes them to RAG answers only.
 *
 *   npx tsx scripts/add-rag-evaluators.ts [projectId]   (default: org "bizz", project "Default")
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { RAG_TRACE_NAME } from "../src/lib/rag/pipeline";
import { FAITHFULNESS_RUBRIC, RELEVANCE_RUBRIC } from "./rag-judges";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

async function upsert(projectId: string, name: string, rubric: string) {
  const data = {
    type: "llm_judge" as const,
    config: { rubric, threshold: 0.7 },
    traceName: RAG_TRACE_NAME,
    active: true,
  };
  const existing = await db.evaluator.findFirst({ where: { projectId, name } });
  if (existing) await db.evaluator.update({ where: { id: existing.id }, data });
  else await db.evaluator.create({ data: { projectId, name, ...data } });
  console.log(`${existing ? "updated" : "created"}: ${name} (traceName=${RAG_TRACE_NAME})`);
}

async function main() {
  let projectId = process.argv[2];
  if (!projectId) {
    const org = await db.organization.findUniqueOrThrow({ where: { slug: "bizz" } });
    projectId = (await db.project.findFirstOrThrow({ where: { orgId: org.id, name: "Default" } })).id;
  }
  await upsert(projectId, "rag-faithfulness", FAITHFULNESS_RUBRIC);
  await upsert(projectId, "rag-answer-relevance", RELEVANCE_RUBRIC);
}

main().finally(() => db.$disconnect());
