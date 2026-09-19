import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { Badge } from "@/components/ui";

export default async function TracesPage({
  params, searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ model?: string; result?: "pass" | "fail"; page?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const page = Math.max(Number(sp.page ?? 1) || 1, 1);

  let data, models;
  try {
    const scope = await getScope();
    [data, models] = await Promise.all([
      scope.tracesFiltered(projectId, { model: sp.model, result: sp.result, page }),
      scope.models(projectId),
    ]);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { model: sp.model, result: sp.result, ...over };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    return `?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Traces</h1>
        <Link href={`/projects/${projectId}`} className="text-sm underline">← Overview</Link>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={`/projects/${projectId}/traces`} className="rounded border px-3 py-1">All</Link>
        {models.map((mo) => (
          <Link key={mo} href={`/projects/${projectId}/traces${qs({ model: mo, page: undefined })}`}
                className={`rounded border px-3 py-1 ${sp.model === mo ? "bg-black text-white" : ""}`}>
            {mo}
          </Link>
        ))}
        <Link href={`/projects/${projectId}/traces${qs({ result: "fail", page: undefined })}`}
              className={`rounded border px-3 py-1 ${sp.result === "fail" ? "bg-black text-white" : ""}`}>
          has failing eval
        </Link>
      </div>

      <div className="text-xs text-gray-500">
        {data.total.toLocaleString()} traces · page {data.page} of {data.pages || 1}
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Name</th><th>Model</th><th>Latency</th><th>Cost</th><th>Evals</th><th></th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-2">{t.name}</td>
              <td className="text-gray-500">{t.model}</td>
              <td>{t.latencyMs ? `${t.latencyMs}ms` : "—"}</td>
              <td>${Number(t.costUsd).toFixed(6)}</td>
              <td className="space-x-1">
                {t.evalRuns.map((r) => (
                  <Badge key={r.id}
                         kind={r.status === "failed" ? "error" : r.status !== "done" ? "muted" : r.passed ? "pass" : "fail"}>
                    {r.evaluator.name}
                  </Badge>
                ))}
              </td>
              <td><Link href={`/traces/${t.id}`} className="underline">view</Link></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 text-sm">
        {page > 1 && (
          <Link href={`/projects/${projectId}/traces${qs({ page: String(page - 1) })}`}
                className="rounded border px-3 py-1">← Prev</Link>
        )}
        {page < data.pages && (
          <Link href={`/projects/${projectId}/traces${qs({ page: String(page + 1) })}`}
                className="rounded border px-3 py-1">Next →</Link>
        )}
      </div>
    </main>
  );
}