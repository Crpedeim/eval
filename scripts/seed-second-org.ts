import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { generateApiKey } from "../src/lib/api-key";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const user = await db.user.upsert({
    where: { email: "outsider@example.com" },
    update: {},
    create: { email: "outsider@example.com", name: "Outsider" },
  });

  const org = await db.organization.upsert({
    where: { slug: "rival" },
    update: {},
    create: { name: "Rival Corp", slug: "rival" },
  });

  await db.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: {},
    create: { userId: user.id, orgId: org.id, role: "owner" },
  });

  let project = await db.project.findFirst({ where: { orgId: org.id, name: "Rival Default" } });
  if (!project) project = await db.project.create({ data: { orgId: org.id, name: "Rival Default" } });

  const existingKey = await db.apiKey.count({ where: { projectId: project.id } });
  if (existingKey === 0) {
    const { raw, hashedKey, prefix } = generateApiKey();
    await db.apiKey.create({ data: { projectId: project.id, hashedKey, prefix, name: "rival key" } });
    console.log("RIVAL API KEY:", raw);
  }

  await db.evaluator.createMany({
    data: [{ projectId: project.id, name: "rival-non-empty", type: "assertion",
             config: { rule: "non_empty" }, active: true }],
    skipDuplicates: true,
  });

  console.log("rival projectId:", project.id);
}

main().finally(() => db.$disconnect());