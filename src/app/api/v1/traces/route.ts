import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/authenticate-request";
import { getBoss } from "@/lib/queue";
import { createEvalRunsAndEnqueue } from "@/lib/enqueue-evals";
import { log } from "@/lib/logger";
import { TraceInput, spanCostUsd, traceCostUsd } from "@/lib/trace-input";

/** Ingest one trace. Contract: docs/TRACING_API.md (keep it in sync with this file). */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = TraceInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const d = parsed.data;
  // Cost is computed here from tokens and the price table; a client-sent cost is never used.
  const costUsd = traceCostUsd(d);
  const now = new Date();

  const simulateFailure =
    process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("fail") === "1";

  try {
    // Resolve the boss BEFORE opening the transaction: its first call creates queues.
    await getBoss();

    const result = await db.$transaction(async (tx) => {
      const trace = await tx.trace.create({
        data: {
          projectId: auth.project.id,
          name: d.name,
          input: d.input,
          output: d.output,
          model: d.model,
          promptTokens: d.promptTokens,
          completionTokens: d.completionTokens,
          costUsd,
          latencyMs: d.latencyMs,
          status: d.status ?? "ok",
          ...(d.metadata ? { metadata: d.metadata as Prisma.InputJsonValue } : {}),
          ...(d.spans?.length
            ? {
                spans: {
                  create: d.spans.map((s) => ({
                    spanKey: s.id ?? null,
                    parentKey: s.parentId ?? null,
                    name: s.name,
                    kind: s.kind ?? null,
                    status: s.status,
                    model: s.model,
                    startedAt: s.startedAt ?? now,
                    latencyMs: s.latencyMs,
                    promptTokens: s.promptTokens,
                    completionTokens: s.completionTokens,
                    costUsd: spanCostUsd(s),
                    ...(s.metadata ? { metadata: s.metadata as Prisma.InputJsonValue } : {}),
                  })),
                },
              }
            : {}),
        },
      });

      const enqueued = await createEvalRunsAndEnqueue(tx, trace.id, auth.project.id, d.name);

      if (simulateFailure) {
        throw new Error("simulated crash after writes, before commit");
      }

      return { id: trace.id, evalsQueued: enqueued, costUsd, spans: d.spans?.length ?? 0 };
    });

    return NextResponse.json(result, { status: 202 });
  } catch (e) {
    log.error("trace.ingest_failed", { projectId: auth.project.id, error: e instanceof Error ? e.message : String(e) });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
