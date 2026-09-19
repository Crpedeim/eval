import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { authenticateApiKey } from "@/lib/authenticate-request";
import { computeCostUsd } from "@/lib/pricing";
import { getBoss } from "@/lib/queue";
import { createEvalRunsAndEnqueue } from "@/lib/enqueue-evals";

const TraceInput = z.object({
  name: z.string().min(1),
  input: z.string(),
  output: z.string(),
  model: z.string().min(1),
  promptTokens: z.number().int().nonnegative().default(0),
  completionTokens: z.number().int().nonnegative().default(0),
  latencyMs: z.number().int().nonnegative().optional(),
  status: z.string().optional(),
metadata: z.record(z.string(), z.unknown()).optional(),
});

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
  const costUsd = computeCostUsd(d.model, d.promptTokens, d.completionTokens);
  // Resolve the boss BEFORE opening the transaction (see note below).
  await getBoss();

  const simulateFailure =
  process.env.NODE_ENV !== "production" && req.nextUrl.searchParams.get("fail") === "1";

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
      },
    });

    const enqueued = await createEvalRunsAndEnqueue(tx, trace.id, auth.project.id);

    if (simulateFailure) {
      throw new Error("simulated crash after writes, before commit");
    }

    return { id: trace.id, evalsQueued: enqueued };
  });

  return NextResponse.json(result, { status: 202 })
};