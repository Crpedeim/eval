import { z } from "zod";
import { computeCostUsd } from "./pricing";

/**
 * Request body of POST /api/v1/traces. docs/TRACING_API.md documents this schema field by
 * field; change both together.
 */
export const MAX_SPANS = 500;

export const SpanInput = z.object({
  /** Caller's id for this span, unique within the request; children point at it with parentId. */
  id: z.string().min(1).max(128).optional(),
  /** id of the parent span in the same request; omit for a top-level span. */
  parentId: z.string().min(1).max(128).optional(),
  name: z.string().min(1).max(200),
  /** Free-form category, e.g. "agent", "llm", "tool", "retrieval". */
  kind: z.string().min(1).max(32).optional(),
  status: z.enum(["ok", "error"]).default("ok"),
  model: z.string().min(1).optional(),
  startedAt: z.coerce.date().optional(),
  latencyMs: z.number().int().nonnegative(),
  promptTokens: z.number().int().nonnegative().default(0),
  completionTokens: z.number().int().nonnegative().default(0),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const TraceInput = z
  .object({
    name: z.string().min(1),
    input: z.string(),
    output: z.string(),
    model: z.string().min(1),
    promptTokens: z.number().int().nonnegative().default(0),
    completionTokens: z.number().int().nonnegative().default(0),
    latencyMs: z.number().int().nonnegative().optional(),
    status: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    spans: z.array(SpanInput).max(MAX_SPANS).optional(),
  })
  .superRefine((t, ctx) => {
    const spans = t.spans ?? [];
    const ids = new Map<string, number>();
    spans.forEach((s, i) => {
      if (s.id === undefined) return;
      if (ids.has(s.id)) ctx.addIssue({ code: "custom", path: ["spans", i, "id"], message: `duplicate span id "${s.id}"` });
      else ids.set(s.id, i);
    });
    spans.forEach((s, i) => {
      if (s.parentId === undefined) return;
      if (!ids.has(s.parentId)) {
        ctx.addIssue({ code: "custom", path: ["spans", i, "parentId"], message: `parentId "${s.parentId}" is not the id of a span in this request` });
        return;
      }
      // Walk up the parent chain; reaching this span again (or any span twice) is a cycle.
      const seen = new Set<string>(s.id === undefined ? [] : [s.id]);
      let parent: string | undefined = s.parentId;
      while (parent !== undefined) {
        if (seen.has(parent)) {
          ctx.addIssue({ code: "custom", path: ["spans", i, "parentId"], message: "span parents form a cycle" });
          return;
        }
        seen.add(parent);
        const idx = ids.get(parent);
        parent = idx === undefined ? undefined : spans[idx].parentId;
      }
    });
  });

export type TraceInput = z.infer<typeof TraceInput>;

/** Cost of one span: from its own model and tokens; a span without a model costs 0. */
export const spanCostUsd = (
  s: { model?: string; promptTokens: number; completionTokens: number },
  at: Date = new Date()
) => (s.model ? computeCostUsd(s.model, s.promptTokens, s.completionTokens, at) : 0);

/**
 * Trace cost, always computed server-side. With spans, it is the sum of the span costs
 * (each span's tokens are its own calls, not its children's); without spans, it comes from
 * the trace-level model and tokens.
 */
export function traceCostUsd(t: TraceInput, at: Date = new Date()): number {
  if (t.spans?.length) return t.spans.reduce((a, s) => a + spanCostUsd(s, at), 0);
  return computeCostUsd(t.model, t.promptTokens, t.completionTokens, at);
}
