import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/authenticate-request";
import { answerQuestion } from "@/lib/rag/pipeline";
import { classify, TransientError } from "@/lib/errors";

const Query = z.object({
  question: z.string().min(1).max(2000),
  k: z.number().int().min(1).max(20).optional(),
});

/** Answer a question over the project's documents. The answer is recorded as a trace. */
export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req.headers.get("authorization"));
  if (!auth) return NextResponse.json({ error: "invalid api key" }, { status: 401 });

  const parsed = Query.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const r = await answerQuestion(auth.project.id, parsed.data.question, {
      k: parsed.data.k,
      metadata: { via: "api", apiKeyId: auth.apiKeyId },
    });
    return NextResponse.json({
      traceId: r.traceId,
      answer: r.answer,
      citations: r.citations,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      spans: r.spans.map((s) => ({
        name: s.name, model: s.model, latencyMs: s.latencyMs,
        promptTokens: s.promptTokens, completionTokens: s.completionTokens, costUsd: s.costUsd,
        ...(s.name === "generate" ? { tokensPerSec: s.metadata.tokensPerSec } : {}),
      })),
      evalsQueued: r.evalsQueued,
    });
  } catch (e) {
    // Upstream model errors: 503 if retrying may help, 502 otherwise.
    const err = classify(e);
    return NextResponse.json({ error: err.message }, { status: err instanceof TransientError ? 503 : 502 });
  }
}
