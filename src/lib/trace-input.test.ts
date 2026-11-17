import { test } from "node:test";
import assert from "node:assert/strict";
import { TraceInput, traceCostUsd, MAX_SPANS } from "./trace-input";
import { computeCostUsd } from "./pricing";

const base = { name: "triage.run", input: "ticket text", output: "routed to billing", model: "gemini-3.1-pro-preview" };

const multiAgent = {
  ...base,
  promptTokens: 4200,
  completionTokens: 380,
  latencyMs: 5120,
  spans: [
    { id: "root", name: "orchestrator", kind: "agent", latencyMs: 5120, startedAt: "2026-11-17T10:00:00.000Z" },
    { id: "plan", parentId: "root", name: "planner", kind: "llm", model: "gemini-3.1-pro-preview", latencyMs: 1900, promptTokens: 3000, completionTokens: 300 },
    { id: "classify", parentId: "root", name: "classifier", kind: "agent", latencyMs: 2100 },
    { id: "classify.llm", parentId: "classify", name: "classify", kind: "llm", model: "gemini-3.8-flash", latencyMs: 800, promptTokens: 1200, completionTokens: 80 },
    { parentId: "classify", name: "kb_search", kind: "tool", latencyMs: 400, status: "error", metadata: { error: "timeout" } },
  ],
};

test("a multi-agent span tree parses with defaults applied", () => {
  const r = TraceInput.safeParse(multiAgent);
  assert.ok(r.success, JSON.stringify(r.error?.issues));
  const spans = r.data.spans!;
  assert.equal(spans.length, 5);
  assert.equal(spans[0].status, "ok");
  assert.equal(spans[0].promptTokens, 0);
  assert.equal(spans[4].status, "error");
  assert.ok(spans[0].startedAt instanceof Date);
});

test("trace cost with spans = sum of span costs (spans without a model cost 0)", () => {
  const t = TraceInput.parse(multiAgent);
  const expected =
    computeCostUsd("gemini-3.1-pro-preview", 3000, 300) + computeCostUsd("gemini-3.8-flash", 1200, 80);
  assert.ok(Math.abs(traceCostUsd(t) - expected) < 1e-12);
  assert.ok(expected > 0, "both Gemini 3 models must be priced");
});

test("trace cost without spans comes from the trace-level tokens", () => {
  const t = TraceInput.parse({ ...base, promptTokens: 1000, completionTokens: 100 });
  assert.equal(traceCostUsd(t), computeCostUsd(base.model, 1000, 100));
});

test("a client-supplied cost is ignored", () => {
  const t = TraceInput.parse({ ...base, promptTokens: 10, costUsd: 999, spans: [{ name: "x", latencyMs: 1, costUsd: 5 }] });
  assert.equal("costUsd" in t, false);
  assert.equal(traceCostUsd(t), 0);
});

function issues(body: unknown) {
  const r = TraceInput.safeParse(body);
  assert.equal(r.success, false);
  return r.error!.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
}

test("duplicate span ids are rejected", () => {
  assert.deepEqual(issues({ ...base, spans: [{ id: "a", name: "a", latencyMs: 1 }, { id: "a", name: "b", latencyMs: 1 }] }),
    ['spans.1.id: duplicate span id "a"']);
});

test("parentId must name a span in the same request", () => {
  assert.deepEqual(issues({ ...base, spans: [{ id: "a", parentId: "nope", name: "a", latencyMs: 1 }] }),
    ['spans.0.parentId: parentId "nope" is not the id of a span in this request']);
});

test("cycles are rejected, including self-parenting", () => {
  assert.deepEqual(issues({ ...base, spans: [{ id: "a", parentId: "a", name: "a", latencyMs: 1 }] }),
    ["spans.0.parentId: span parents form a cycle"]);
  const two = issues({ ...base, spans: [
    { id: "a", parentId: "b", name: "a", latencyMs: 1 },
    { id: "b", parentId: "a", name: "b", latencyMs: 1 },
  ] });
  assert.equal(two.length, 2);
});

test("required fields, types and the span limit are enforced", () => {
  assert.ok(issues({ input: "", output: "", model: "m" }).some((i) => i.startsWith("name:")));
  assert.ok(issues({ ...base, promptTokens: -1 }).some((i) => i.startsWith("promptTokens:")));
  assert.ok(issues({ ...base, spans: [{ name: "x" }] }).some((i) => i.startsWith("spans.0.latencyMs:")));
  assert.ok(issues({ ...base, spans: [{ name: "x", latencyMs: 1, status: "failed" }] }).some((i) => i.startsWith("spans.0.status:")));
  const many = Array.from({ length: MAX_SPANS + 1 }, (_, i) => ({ name: `s${i}`, latencyMs: 1 }));
  assert.ok(issues({ ...base, spans: many }).some((i) => i.startsWith("spans:")));
});

// docs/TRACING_API.md is the contract another project integrates against: its examples
// must parse with the real schema and produce the numbers the doc states.
test("docs/TRACING_API.md examples match the schema and cost rules", async () => {
  const { readFileSync } = await import("fs");
  const doc = readFileSync("docs/TRACING_API.md", "utf8");
  const multi = doc.match(/<<'JSON'\n([\s\S]*?)\nJSON\n/);
  assert.ok(multi, "multi-agent example not found");
  const t = TraceInput.parse(JSON.parse(multi[1]));
  assert.equal(t.spans!.length, 5);
  assert.ok(Math.abs(traceCostUsd(t, new Date("2026-11-17")) - 0.0108) < 1e-12);
  assert.match(doc, /"costUsd": 0\.0108, "spans": 5/);

  const minimal = doc.match(/-d '(\{"name":"summarize"[^']*)'/);
  assert.ok(minimal, "minimal example not found");
  assert.ok(TraceInput.safeParse(JSON.parse(minimal[1])).success);

  const bad = JSON.parse(multi[1]);
  bad.spans[1].parentId = "plannr";
  bad.spans[1].id = "x";
  const r = TraceInput.safeParse({ ...bad, spans: [bad.spans[1]] });
  assert.ok(!r.success);
  assert.deepEqual(r.error.flatten().fieldErrors, { spans: ['parentId "plannr" is not the id of a span in this request'] });
  assert.match(doc, /"fieldErrors": \{ "spans": \["parentId \\"plannr\\" is not the id of a span in this request"\] \}/);
});
