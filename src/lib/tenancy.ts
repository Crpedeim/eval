import { auth } from "@/auth";
import { db } from "./db";
import {
  timeSeries, evalSummary, latencyStats, retryHealth, ragSpanStats, ragRequestStats,
} from "./metrics";
import { getBoss } from "./queue";
import { createDocumentAndEnqueue, type DocumentUpload } from "./rag/documents";
import { answerQuestion } from "./rag/pipeline";
import { ragEvalReport } from "./rag/report";
import { createRagEvalRun, ragModelConfig, type RagDataset } from "./rag/eval";
import type { RetrievalMode } from "./rag/retrieve";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}
export class EvalInProgressError extends Error {}

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
      include: {
        evalRuns: { include: { evaluator: true } },
        project: true,
        spans: { orderBy: { startedAt: "asc" } },
      },
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

  // ---- RAG ---------------------------------------------------------------

  async documents(projectId: string) {
    await this.assertProject(projectId);
    return db.document.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      // never ship raw content/bytes to a page
      select: {
        id: true, name: true, kind: true, status: true, sizeBytes: true,
        chunkCount: true, attempts: true, error: true, stats: true, createdAt: true,
      },
    });
  }

  async ragOverview(projectId: string, days = 14) {
    await this.assertProject(projectId);   // tenancy gate for the raw SQL below
    const [spans, requests, runs] = await Promise.all([
      ragSpanStats(projectId, days),
      ragRequestStats(projectId, days),
      db.ragEvalRun.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true },
      }),
    ]);
    const reports = await Promise.all(runs.map((r) => ragEvalReport(r.id)));
    return { spans, requests, evalRuns: reports.filter((r) => r !== null) };
  }

  async ragEvalRun(runId: string) {
    const run = await db.ragEvalRun.findFirst({
      where: { id: runId, project: { orgId: { in: this.orgIds } } },
      select: { id: true, projectId: true },
    });
    if (!run) throw new ForbiddenError(`rag eval run ${runId} not accessible`);
    return { projectId: run.projectId, report: (await ragEvalReport(run.id))! };
  }

  async createDocument(projectId: string, upload: DocumentUpload) {
    await this.assertProject(projectId);
    await getBoss();
    return db.$transaction((tx) => createDocumentAndEnqueue(tx, projectId, upload));
  }

  /**
   * Start a RAG eval run from the UI. Refuses while another run in this project still has
   * unsettled questions, so a double click can't double the model spend.
   */
  async startRagEval(projectId: string, dataset: RagDataset, k: number, retrieval?: RetrievalMode) {
    await this.assertProject(projectId);
    const inFlight = await db.ragEvalItem.count({
      where: { run: { projectId }, status: { in: ["queued", "running"] } },
    });
    if (inFlight > 0) throw new EvalInProgressError(`${inFlight} questions from an earlier run are still running`);
    return createRagEvalRun(projectId, dataset, {
      k,
      config: { ...ragModelConfig(retrieval), startedBy: this.userId, via: "ui" },
    });
  }

  async askRag(projectId: string, question: string, k?: number) {
    await this.assertProject(projectId);
    return answerQuestion(projectId, question, { k, metadata: { via: "ui", userId: this.userId } });
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
