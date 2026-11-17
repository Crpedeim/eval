/**
 * Measure the live ingestion API and the worker end to end.
 *
 *   BASE_URL=https://... EVAL_API_KEY=evp_live_... DIRECT_URL=postgres://... \
 *     npx tsx scripts/live-trace-bench.ts [n=30] [gapMs=0]
 *
 * gapMs > 0 waits between requests, so each trace's evaluations run on an idle worker
 * (settle time without queueing); gapMs = 0 measures a burst (settle time includes queueing).
 *
 * Sends n traces one after another (client-side latency of POST /api/v1/traces), then
 * reads the database (read-only) until every evaluator run of those traces has settled,
 * and reports, per trace, the time from the trace row's createdAt to its last evaluator
 * run's updatedAt (both database clock, so no client/server clock skew).
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const BASE = process.env.BASE_URL!;
const KEY = process.env.EVAL_API_KEY!;
const n = Number(process.argv[2] ?? 30);
const gapMs = Number(process.argv[3] ?? 0);

function pct(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
}
const summary = (xs: number[]) => ({
  n: xs.length, min: Math.min(...xs), p50: pct(xs, 0.5), p95: pct(xs, 0.95), max: Math.max(...xs),
  mean: xs.reduce((a, b) => a + b, 0) / xs.length,
});

async function main() {
  if (!BASE || !KEY) throw new Error("set BASE_URL and EVAL_API_KEY");
  const latencies: number[] = [];
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const body = {
      name: "live-bench",
      input: `Summarise: request ${i} of the live latency benchmark. The platform stores each trace and queues its evaluators in one transaction.`,
      output: "The platform stores each trace and queues its evaluators atomically.",
      model: "gemini-3.8-flash",
      promptTokens: 40, completionTokens: 14, latencyMs: 900,
      metadata: { bench: "live-trace-bench", i },
    };
    const t0 = performance.now();
    const res = await fetch(`${BASE}/api/v1/traces`, {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { id?: string };
    latencies.push(Math.round(performance.now() - t0));
    if (res.status !== 202 || !json.id) throw new Error(`request ${i}: HTTP ${res.status} ${JSON.stringify(json)}`);
    ids.push(json.id);
    if (gapMs && i < n - 1) await new Promise((r) => setTimeout(r, gapMs));
  }
  console.log("POST /api/v1/traces client latency ms (sequential, from this machine):", JSON.stringify(summary(latencies)));
  console.log("first request ms:", latencies[0]);

  const started = Date.now();
  for (;;) {
    const runs = await db.evalRun.findMany({ where: { traceId: { in: ids } }, select: { status: true } });
    const open = runs.filter((r) => r.status === "queued" || r.status === "running").length;
    if (open === 0) break;
    if (Date.now() - started > 15 * 60_000) throw new Error(`${open} evaluator runs still open after 15 min`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const traces = await db.trace.findMany({
    where: { id: { in: ids } },
    select: { createdAt: true, evalRuns: { select: { status: true, updatedAt: true, attempts: true, evaluator: { select: { name: true } } } } },
  });
  const settle = traces.map((t) => Math.max(...t.evalRuns.map((r) => r.updatedAt.getTime())) - t.createdAt.getTime());
  const runs = traces.flatMap((t) => t.evalRuns);
  const byStatus = runs.reduce<Record<string, number>>((a, r) => ((a[`${r.evaluator.name}:${r.status}`] = (a[`${r.evaluator.name}:${r.status}`] ?? 0) + 1), a), {});
  console.log("trace createdAt -> last evaluator run settled, ms (DB clock):", JSON.stringify(summary(settle)));
  console.log("evaluator runs:", runs.length, JSON.stringify(byStatus), "retries:", runs.filter((r) => r.attempts > 1).length);
  const first = Math.min(...traces.map((t) => t.createdAt.getTime()));
  const last = Math.max(...runs.map((r) => r.updatedAt.getTime()));
  console.log(`all ${n} traces' evaluations settled ${((last - first) / 1000).toFixed(1)} s after the first trace was stored`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await db.$disconnect(); });
