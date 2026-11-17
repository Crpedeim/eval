import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { Badge, Card, Stat } from "@/components/ui";
import { bundledDatasets } from "@/lib/rag/datasets";
import { retrievalMode, RETRIEVAL_MODES } from "@/lib/rag/retrieve";
import { uploadDocumentAction, askAction, runEvalAction } from "./actions";

const num = (v: number | null, d = 2) => (v === null ? "—" : v.toFixed(d));
const ms = (v: number | null) => (v === null ? "—" : `${Math.round(v)}ms`);
const usd = (v: number | null) => (v === null ? "—" : `$${v.toFixed(6)}`);

export default async function RagPage({
  params, searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ days?: string; error?: string; uploaded?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const days = Math.min(Number(sp.days ?? 14) || 14, 90);

  let docs, overview;
  try {
    const scope = await getScope();
    [docs, overview] = await Promise.all([scope.documents(projectId), scope.ragOverview(projectId, days)]);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  const datasets = bundledDatasets();
  const gen = overview.spans.find((s) => s.name === "generate");
  const chunks = docs.reduce((a, d) => a + d.chunkCount, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">RAG</h1>
        <Link href={`/projects/${projectId}`} className="text-sm underline">← Overview</Link>
      </div>

      {sp.error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{sp.error}</p>}
      {sp.uploaded && (
        <p className="rounded bg-green-50 p-3 text-sm text-green-700">
          Queued {sp.uploaded} for ingestion — the worker chunks and embeds it in the background.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Stat label="Documents" value={docs.length.toLocaleString()} sub={`${chunks.toLocaleString()} chunks`} />
        <Stat label="RAG requests" value={overview.requests.requests.toLocaleString()} sub={`last ${days} days`} />
        <Stat label="Cost / request" value={usd(overview.requests.avgCostUsd)} sub="retrieve + generate" />
        <Stat label="Latency p95" value={ms(overview.requests.p95)} sub={`p50 ${ms(overview.requests.p50)}`} />
        <Stat label="Generate tok/s" value={num(gen?.medianTokensPerSec ?? null, 1)} sub="median per request" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Upload a document (.md, .txt, .csv, .pdf — max 5MB)">
          <form action={uploadDocumentAction.bind(null, projectId)} className="flex items-center gap-2">
            <input type="file" name="file" accept=".md,.markdown,.txt,.csv,.pdf" required className="text-sm" />
            <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Upload</button>
          </form>
        </Card>
        <Card title="Ask">
          <form action={askAction.bind(null, projectId)} className="flex gap-2">
            <input name="question" required placeholder="Ask a question about your documents"
                   className="flex-1 rounded border px-2 py-1 text-sm" />
            <input name="k" type="number" min={1} max={20} defaultValue={5}
                   className="w-14 rounded border px-2 py-1 text-sm" title="top-k" />
            <button type="submit" className="rounded bg-black px-3 py-1 text-sm text-white">Ask</button>
          </form>
        </Card>
      </div>

      <Card title="Run evaluation">
        <form action={runEvalAction.bind(null, projectId)} className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2">
            Dataset
            <select name="dataset" className="rounded border px-2 py-1" defaultValue={datasets[0]?.name}>
              {datasets.map((d) => (
                <option key={d.name} value={d.name}>{d.name} ({d.questions} questions)</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-gray-600">
            or upload JSON
            <input type="file" name="file" accept=".json,application/json" className="text-sm" />
          </label>
          <label className="flex items-center gap-2">
            k
            <input name="k" type="number" min={1} max={20} defaultValue={5} className="w-14 rounded border px-2 py-1" />
          </label>
          <label className="flex items-center gap-2">
            Retrieval
            <select name="retrieval" className="rounded border px-2 py-1" defaultValue={retrievalMode()}>
              {RETRIEVAL_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <button type="submit" className="rounded bg-black px-3 py-1 text-white">Run evaluation</button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          Each question is answered by the worker through the live pipeline, then judged for faithfulness and
          relevance. The project must already contain the documents the dataset was written against.
          Uploaded files use the format of <code>datasets/rag/questions.json</code> (max 500 questions).
        </p>
      </Card>

      <Card title="Steps (rag.answer traces)">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Step</th><th>Count</th><th>p50</th><th>p95</th>
              <th>Avg tokens in / out</th><th>Median tok/s</th><th>Avg cost</th>
            </tr>
          </thead>
          <tbody>
            {overview.spans.map((s) => (
              <tr key={s.name} className="border-b last:border-0">
                <td className="py-2 font-medium">{s.name}</td>
                <td>{s.count}</td>
                <td>{ms(s.p50)}</td>
                <td>{ms(s.p95)}</td>
                <td>{num(s.avgPromptTokens, 0)} / {num(s.avgCompletionTokens, 0)}</td>
                <td>{num(s.medianTokensPerSec, 1)}</td>
                <td>{s.avgCostUsd === null ? "—" : `$${s.avgCostUsd.toFixed(8)}`}</td>
              </tr>
            ))}
            {overview.spans.length === 0 && (
              <tr><td colSpan={7} className="py-2 text-gray-500">No RAG requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card title="Evaluation runs">
        <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Dataset</th><th>k</th><th>Questions</th><th>Recall@k</th><th>MRR</th>
              <th>Judges (mean score)</th><th>p95</th><th>Cost / answer</th><th>incl. judges</th><th></th>
            </tr>
          </thead>
          <tbody>
            {overview.evalRuns.map((r) => (
              <tr key={r.run.id} className="border-b last:border-0">
                <td className="py-2">{r.run.dataset}</td>
                <td>{r.run.k}</td>
                <td>{r.items.done}/{r.items.total}{r.items.pending ? ` (${r.items.pending} pending)` : ""}</td>
                <td>{num(r.retrieval.recallAtK, 3)}</td>
                <td>{num(r.retrieval.mrr, 3)}</td>
                <td>
                  {r.judges.map((j) => (
                    <div key={j.evaluator} className="whitespace-nowrap">{j.evaluator}: {num(j.meanScore)}</div>
                  ))}
                </td>
                <td>{ms(r.latency.request.p95Ms)}</td>
                <td>{usd(r.cost.meanPerRequestFromSpansUsd)}</td>
                <td>{usd(r.cost.meanPerEvalAnswerUsd)}</td>
                <td><Link href={`/projects/${projectId}/rag/evals/${r.run.id}`} className="underline">view</Link></td>
              </tr>
            ))}
            {overview.evalRuns.length === 0 && (
              <tr><td colSpan={10} className="py-2 text-gray-500">No eval runs yet. Start one with Run evaluation above.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card title="Documents">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Name</th><th>Kind</th><th>Status</th><th>Size</th><th>Chunks</th>
              <th>Embed time</th><th>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const stats = d.stats as { embedMs?: number } | null;
              return (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-2">{d.name}</td>
                  <td className="text-gray-500">{d.kind}</td>
                  <td>
                    <Badge kind={d.status === "ready" ? "pass" : d.status === "failed" ? "error" : "muted"}>{d.status}</Badge>
                    {d.error && <span className="ml-2 text-xs text-red-600">{d.error}</span>}
                  </td>
                  <td>{(d.sizeBytes / 1024).toFixed(1)} KB</td>
                  <td>{d.chunkCount}</td>
                  <td>{ms(stats?.embedMs ?? null)}</td>
                  <td>{d.attempts}</td>
                </tr>
              );
            })}
            {docs.length === 0 && <tr><td colSpan={7} className="py-2 text-gray-500">No documents.</td></tr>}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
