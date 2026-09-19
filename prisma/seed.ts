import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import {generateApiKey} from "../src/lib/api-key";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const user = await db.user.create({ data: { email: "garv@example.com", name: "Garv" } });
  const org = await db.organization.create({ data: { name: "Bizz", slug: "bizz" } });
  await db.membership.create({ data: { userId: user.id, orgId: org.id, role: "owner" } });
  const project = await db.project.create({ data: { orgId: org.id, name: "Default" } });

  const { raw, hashedKey, prefix } = generateApiKey();
  await db.apiKey.create({ data: { projectId: project.id, hashedKey, prefix, name: "seed key" } });


  await db.evaluator.createMany({
    data: [
      {
        projectId: project.id,
        name: "output-not-empty",
        type: "assertion",
        config: { rule: "non_empty" },
        active: true,
      },
      {
        projectId: project.id,
        name: "helpfulness-judge",
        type: "llm_judge",
        config: {
          rubric: "Rate how helpful and accurate the output is given the input.",
          threshold: 0.7,
        },
        active: true,
      },
    ],
  });

  console.log("projectId:", project.id);
  console.log("API KEY (copy now — shown once):", raw);


    
}

main().finally(() => db.$disconnect());