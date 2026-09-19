import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { VolumeChart, CostChart, TokenChart, PassRateChart } from "@/components/charts";
import { Card, Stat } from "@/components/ui";

export default async function ProjectDashboard({
  params, searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const { projectId } = await params;
  const { days: daysRaw } = await searchParams;
  const days = Math.min(Number(daysRaw ?? 14) || 14, 90);

  let m;
  try {
    const scope = await getScope();
    m = await scope.metrics(projectId, days);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  const totalTraces = m.series.reduce((a, p) => a + p.traces, 0);
  const totalCost = m.series.reduce((a, p) => a + p.costUsd, 0);
  const retryRate = m.retries.totalRuns
    ? ((m.retries.retried / m.retries.totalRuns) * 100).toFixed(1)
    : "0.0";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <div className="flex gap-2 text-sm">
          {[7, 14, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/projects/${projectId}?days=${d}`}
              className={`rounded px-3 py-1 ${d === days ? "bg-black text-white" : "border border-gray-300"}`}
            >
              {d}d
            </Link>
          ))}
          <Link href={`/projects/${projectId}/traces`} className="rounded border border-gray-300 px-3 py-1">
            Traces →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Traces" value={totalTraces.toLocaleString()} sub={`last ${days} days`} />
        <Stat label="Cost" value={`$${totalCost.toFixed(2)}`} sub={`last ${days} days`} />
        <Stat
          label="Latency p95"
          value={m.latency.p95 !== null ? `${Math.round(m.latency.p95)}ms` : "—"}
          sub={m.latency.p50 !== null ? `p50 ${Math.round(m.latency.p50)}ms` : undefined}
        />
        <Stat
          label="Retry rate"
          value={`${retryRate}%`}
          sub={`${m.retries.deadLettered} dead-lettered`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Trace volume"><VolumeChart data={m.series} /></Card>
        <Card title="Cost (USD)"><CostChart data={m.series} /></Card>
        <Card title="Tokens"><TokenChart data={m.series} /></Card>
        <Card title="Pass rate by evaluator"><PassRateChart data={m.evals} /></Card>
      </div>

      <Card title="Evaluators">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Name</th><th>Type</th><th>Runs</th>
              <th>Pass</th><th>Fail</th><th>Errored</th><th>Pass rate</th><th>Avg score</th>
            </tr>
          </thead>
          <tbody>
            {m.evals.map((e) => (
              <tr key={e.evaluator} className="border-b last:border-0">
                <td className="py-2 font-medium">{e.evaluator}</td>
                <td className="text-gray-500">{e.type}</td>
                <td>{e.total.toLocaleString()}</td>
                <td>{e.passed.toLocaleString()}</td>
                <td>{e.failed.toLocaleString()}</td>
                <td>{e.errored.toLocaleString()}</td>
                <td>{e.passRate === null ? "—" : `${(e.passRate * 100).toFixed(1)}%`}</td>
                <td>{e.avgScore === null ? "—" : e.avgScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}