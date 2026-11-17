import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { Badge, Card, Stat } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";

const num = (v: number | null, d = 3) => (v === null ? "—" : v.toFixed(d));
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v)}ms`);

export default async function RagEvalRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  let projectId, r;
  try {
    const scope = await getScope();
    ({ projectId, report: r } = await scope.ragEvalRun(runId));
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  const settling = r.items.pending > 0 || r.judges.some((j) => j.pending > 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      {settling && <AutoRefresh />}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Eval · {r.run.dataset}</h1>
        <Link href={`/projects/${projectId}/rag`} className="text-sm underline">← RAG</Link>
      </div>
      <p className="text-sm text-gray-500">
        k={r.run.k} · {r.items.done}/{r.items.total} answered · {r.items.failed} failed · {r.items.pending} pending{settling ? " (refreshing every 5 s)" : ""} ·{" "}
        {new Date(r.run.createdAt).toLocaleString()}
      </p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label={`Recall@${r.run.k}`} value={num(r.retrieval.recallAtK)} sub={`hit rate ${num(r.retrieval.hitRate)}`} />
        <Stat label="MRR" value={num(r.retrieval.mrr)} />
        {r.judges.map((j) => (
          <Stat key={j.evaluator} label={j.evaluator} value={num(j.meanScore, 2)}
                sub={`pass ${j.passRate === null ? "—" : `${(j.passRate * 100).toFixed(0)}%`} · ${j.judged} judged${j.pending ? `, ${j.pending} pending` : ""}${j.errored ? `, ${j.errored} errored` : ""}`} />
        ))}
        <Stat label="Latency p95" value={ms(r.latency.request.p95Ms)} sub={`p50 ${ms(r.latency.request.p50Ms)}`} />
        <Stat label="Generate tok/s" value={num(r.tokens.tokensPerSecMedian, 1)} sub="median per request" />
        <Stat label="Cost / request"
              value={r.cost.meanPerRequestFromSpansUsd === null ? "—" : `$${r.cost.meanPerRequestFromSpansUsd.toFixed(6)}`}
              sub={`total $${r.cost.totalUsd.toFixed(4)}`} />
        <Stat label="Citations" value={num(r.citations.citationRate, 2)}
              sub={`precision ${num(r.citations.citationPrecision, 2)} · ${r.citations.idk} "don't know"`} />
      </div>

      <Card title="Questions">
        <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">ID</th><th>Question</th><th>Recall</th><th>RR</th>
              {r.judges.map((j) => <th key={j.evaluator}>{j.evaluator}</th>)}
              <th>Latency</th><th></th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.id} className="border-b align-top last:border-0">
                <td className="py-2 font-mono text-xs">{row.questionId}</td>
                <td className="max-w-md">
                  <div>{row.question}</div>
                  {row.answer && <div className="mt-1 text-xs text-gray-500">{row.answer}</div>}
                  {row.error && <div className="mt-1 text-xs text-red-600">{row.error}</div>}
                </td>
                <td>{num(row.recallAtK, 2)}</td>
                <td>{num(row.reciprocalRank, 2)}</td>
                {r.judges.map((j) => {
                  const v = row.judges[j.evaluator];
                  return (
                    <td key={j.evaluator}>
                      {!v ? "—" : v.status !== "done"
                        ? <Badge kind={v.status === "failed" ? "error" : "muted"}>{v.status}</Badge>
                        : <Badge kind={v.passed ? "pass" : "fail"}>{num(v.score, 2)}</Badge>}
                    </td>
                  );
                })}
                <td>{ms(row.latencyMs)}</td>
                <td>{row.traceId && <Link href={`/projects/${projectId}/traces/${row.traceId}`} className="underline">trace</Link>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
