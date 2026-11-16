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

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

export const FAITHFULNESS_RUBRIC =
  "The INPUT contains numbered context passages followed by a QUESTION; the OUTPUT is an answer. " +
  "Score FAITHFULNESS only: is every factual claim in the OUTPUT supported by the context passages? " +
  "1.0 = every claim is supported; lower the score for each claim that is unsupported by or contradicts the passages. " +
  "If the OUTPUT says the documents do not contain the answer and the passages indeed lack it, score 1.0. " +
  "Do not judge completeness, style or length, and ignore citation markers like [1].";

export const RELEVANCE_RUBRIC =
  "The INPUT ends with a QUESTION; the OUTPUT is an answer to it. " +
  "Score ANSWER RELEVANCE only: does the OUTPUT directly address what the QUESTION asks? " +
  "1.0 = directly and fully addresses it; 0.5 = partially or with substantial off-topic content; " +
  "0.0 = does not address it, including declining to answer. " +
  "Do not judge factual accuracy against the passages, and do not reward or penalize length.";

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
