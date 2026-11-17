import { Card } from "./ui";

type SpanRow = {
  id: string;
  name: string;
  model: string | null;
  startedAt: Date;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  costUsd: unknown; // Prisma Decimal
  metadata: unknown;
  spanKey?: string | null;
  parentKey?: string | null;
  kind?: string | null;
  status?: string;
};

const isEstimated = (s: SpanRow) =>
  Boolean((s.metadata as { tokensEstimated?: boolean } | null)?.tokensEstimated);

/**
 * Depth-first order with depth, so children sit under their parent. Spans are already in
 * start order; siblings keep it. A span whose parent is missing is shown at the top level.
 */
export function spanTree<T extends SpanRow>(spans: T[]): { span: T; depth: number }[] {
  const keys = new Set(spans.flatMap((s) => (s.spanKey ? [s.spanKey] : [])));
  const children = new Map<string | null, T[]>();
  for (const s of spans) {
    const parent = s.parentKey && keys.has(s.parentKey) ? s.parentKey : null;
    children.set(parent, [...(children.get(parent) ?? []), s]);
  }
  const out: { span: T; depth: number }[] = [];
  const visit = (parent: string | null, depth: number) => {
    for (const s of children.get(parent) ?? []) {
      out.push({ span: s, depth });
      if (s.spanKey) visit(s.spanKey, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** Waterfall of a trace's steps with latency, tokens, tokens/sec and cost per step. */
export function SpansCard({ spans }: { spans: SpanRow[] }) {
  if (spans.length === 0) return null;
  const t0 = Math.min(...spans.map((s) => new Date(s.startedAt).getTime()));
  const end = Math.max(...spans.map((s) => new Date(s.startedAt).getTime() + s.latencyMs));
  const total = Math.max(end - t0, 1);
  const totalCost = spans.reduce((a, s) => a + Number(s.costUsd), 0);
  const rows = spanTree(spans);

  return (
    <Card title={`Spans · ${total}ms · $${totalCost.toFixed(6)}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Step</th><th>Model</th><th className="w-1/3">Timeline</th>
            <th>Latency</th><th>Tokens in / out</th><th>Tok/s</th><th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ span: s, depth }) => {
            const offset = new Date(s.startedAt).getTime() - t0;
            const tps = s.completionTokens > 0 && s.latencyMs > 0
              ? (s.completionTokens / (s.latencyMs / 1000)).toFixed(1) : "—";
            return (
              <tr key={s.id} className="border-b last:border-0">
                <td className="py-2 font-medium" style={{ paddingLeft: `${depth * 1.25}rem` }}>
                  {depth > 0 && <span className="mr-1 text-gray-400">└</span>}
                  {s.name}
                  {s.kind && <span className="ml-2 text-xs font-normal text-gray-400">{s.kind}</span>}
                  {s.status === "error" && <span className="ml-2 rounded bg-red-100 px-1 text-xs text-red-700">error</span>}
                </td>
                <td className="text-gray-500">{s.model ?? "—"}</td>
                <td>
                  <div className="relative h-3 rounded bg-gray-100">
                    <div
                      className="absolute h-3 rounded bg-blue-500"
                      style={{
                        left: `${(offset / total) * 100}%`,
                        width: `${Math.max((s.latencyMs / total) * 100, 1)}%`,
                      }}
                    />
                  </div>
                </td>
                <td>{s.latencyMs}ms</td>
                <td>{s.promptTokens}{isEstimated(s) ? "*" : ""} / {s.completionTokens}</td>
                <td>{tps}</td>
                <td>${Number(s.costUsd).toFixed(8)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {spans.some(isEstimated) && (
        <p className="mt-2 text-xs text-gray-400">
          * estimated (chars/4): the embedding API reports no token usage.
        </p>
      )}
    </Card>
  );
}

type Citation = { n: number; documentName: string; idx: number; score: number };

export function CitationsCard({ metadata }: { metadata: unknown }) {
  const citations = (metadata as { citations?: Citation[] } | null)?.citations;
  if (!citations) return null;
  return (
    <Card title="Citations">
      {citations.length === 0 ? (
        <p className="text-sm text-gray-500">The answer cites no passages.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {citations.map((c) => (
            <li key={c.n}>
              <span className="font-mono">[{c.n}]</span> {c.documentName} · chunk {c.idx} ·
              <span className="text-gray-500"> similarity {c.score.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
