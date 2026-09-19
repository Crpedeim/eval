import { auth } from "@/auth";
import { db } from "./db";
import { timeSeries, evalSummary, latencyStats, retryHealth } from "./metrics";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

export class TenantScope {
  constructor(
    readonly userId: string,
    readonly orgIds: string[]
  ) {}

  /** Throws unless the project belongs to an org this user is a member of. */
  async assertProject(projectId: string) {
    const project = await db.project.findFirst({
      where: { id: projectId, orgId: { in: this.orgIds } },
    });
    if (!project) throw new ForbiddenError(`project ${projectId} not accessible`);
    return project;
  }

  projects() {
    return db.project.findMany({
      where: { orgId: { in: this.orgIds } },
      orderBy: { createdAt: "desc" },
    });
  }

  async traces(projectId: string, take = 50) {
    await this.assertProject(projectId);
    return db.trace.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take,
      include: { evalRuns: { include: { evaluator: true } } },
    });
  }

  async trace(traceId: string) {
    const trace = await db.trace.findFirst({
      where: { id: traceId, project: { orgId: { in: this.orgIds } } },
      include: { evalRuns: { include: { evaluator: true } }, project: true },
    });
    if (!trace) throw new ForbiddenError(`trace ${traceId} not accessible`);
    return trace;
  }

  async evaluators(projectId: string) {
    await this.assertProject(projectId);
    return db.evaluator.findMany({ where: { projectId }, orderBy: { name: "asc" } });
  }

  async metrics(projectId: string, days = 14) {
    await this.assertProject(projectId);   // ← the tenancy gate for all raw SQL

    const [series, evals, latency, retries] = await Promise.all([
      timeSeries(projectId, days),
      evalSummary(projectId, days),
      latencyStats(projectId, days),
      retryHealth(projectId, days),
    ]);

    return { series, evals, latency, retries };
  }

    async tracesFiltered(
    projectId: string,
    opts: { model?: string; status?: string; result?: "pass" | "fail"; page?: number; perPage?: number } = {}
  ) {
    await this.assertProject(projectId);

    const perPage = Math.min(opts.perPage ?? 25, 100);
    const page = Math.max(opts.page ?? 1, 1);

    const where: Record<string, unknown> = { projectId };
    if (opts.model) where.model = opts.model;
    if (opts.status) where.status = opts.status;
    if (opts.result) {
      where.evalRuns = { some: { status: "done", passed: opts.result === "pass" } };
    }

    const [rows, total] = await Promise.all([
      db.trace.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { evalRuns: { include: { evaluator: true } } },
      }),
      db.trace.count({ where }),
    ]);

    return { rows, total, page, perPage, pages: Math.ceil(total / perPage) };
  }

  async models(projectId: string) {
    await this.assertProject(projectId);
    const rows = await db.trace.findMany({
      where: { projectId },
      select: { model: true },
      distinct: ["model"],
    });
    return rows.map((r) => r.model);
  }
}

export async function getScope(): Promise<TenantScope> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();

  const memberships = await db.membership.findMany({
    where: { userId: session.user.id },
    select: { orgId: true },
  });

  return new TenantScope(session.user.id, memberships.map((m) => m.orgId));
}