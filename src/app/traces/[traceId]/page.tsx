import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { Badge, Card } from "@/components/ui";

export default async function TraceDetail({ params }: { params: Promise<{ traceId: string }> }) {
  const { traceId } = await params;

  let t;
  try {
    const scope = await getScope();
    t = await scope.trace(traceId);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-8">
      <Link href={`/projects/${t.projectId}/traces`} className="text-sm underline">← Traces</Link>
      <h1 className="text-2xl font-semibold">{t.name}</h1>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span>{t.model}</span>
        <span>{t.latencyMs ? `${t.latencyMs}ms` : "—"}</span>
        <span>${Number(t.costUsd).toFixed(6)}</span>
        <span>{t.promptTokens} in / {t.completionTokens} out</span>
        <span>{new Date(t.createdAt).toLocaleString()}</span>
      </div>

      <Card title="Input">
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{t.input}</pre>
      </Card>

      <Card title="Output">
        <pre className="whitespace-pre-wrap text-sm text-gray-800">{t.output}</pre>
      </Card>

      <Card title="Evaluations">
        <div className="space-y-3">
          {t.evalRuns.map((r) => (
            <div key={r.id} className="rounded border border-gray-200 p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.evaluator.name}</span>
                <Badge kind={r.status === "failed" ? "error" : r.status !== "done" ? "muted" : r.passed ? "pass" : "fail"}>
                  {r.status === "done" ? (r.passed ? "pass" : "fail") : r.status}
                </Badge>
                {r.score !== null && <span className="text-sm text-gray-500">score {r.score.toFixed(2)}</span>}
                <span className="text-xs text-gray-400">attempt {r.attempts}</span>
              </div>
              {r.reasoning && <p className="mt-2 text-sm text-gray-700">{r.reasoning}</p>}
              {r.error && <p className="mt-2 text-sm text-red-600">{r.error}</p>}
            </div>
          ))}
          {t.evalRuns.length === 0 && <p className="text-sm text-gray-500">No evaluations.</p>}
        </div>
      </Card>
    </main>
  );
}