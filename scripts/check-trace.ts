import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  const traceId = process.argv[2];

  const trace = await db.trace.findUnique({
    where: { id: traceId },
    include: { project: { include: { org: true } } },
  });

  if (!trace) {
    console.log("no such trace id:", traceId);
    return;
  }
  console.log("trace project:", trace.projectId, trace.project.name, trace.project.org.slug);

  const me = await db.user.findFirstOrThrow({ where: { name: "Crpedeim" } });
  const memberships = await db.membership.findMany({
    where: { userId: me.id },
    include: { org: true },
  });
  console.log("my orgs:", memberships.map((m) => m.org.slug));
  console.log("trace org in my orgs:", memberships.some((m) => m.orgId === trace.project.orgId));
}

main().finally(() => db.$disconnect());