export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-medium text-gray-500">{title}</h2>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

export function Badge({ kind, children }: { kind: "pass" | "fail" | "error" | "muted"; children: React.ReactNode }) {
  const styles = {
    pass: "bg-green-100 text-green-800",
    fail: "bg-amber-100 text-amber-800",
    error: "bg-red-100 text-red-800",
    muted: "bg-gray-100 text-gray-600",
  }[kind];
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>;
}