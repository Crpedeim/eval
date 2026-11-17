import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { Card } from "@/components/ui";
import { createKeyAction } from "./actions";
import { KeyForm } from "./key-form";

export default async function KeysPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;

  let keys;
  try {
    const scope = await getScope();
    keys = await scope.apiKeys(projectId);
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) notFound();
    throw e;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">API keys</h1>
        <Link href={`/projects/${projectId}`} className="text-sm underline">← Overview</Link>
      </div>

      <Card title="New key">
        <KeyForm action={createKeyAction.bind(null, projectId)} />
        <p className="mt-3 text-xs text-gray-500">
          Send traces with <code>Authorization: Bearer &lt;key&gt;</code> to <code>POST /api/v1/traces</code>.
          The request format is in{" "}
          <a className="underline" href="https://github.com/Crpedeim/eval/blob/main/docs/TRACING_API.md">docs/TRACING_API.md</a>.
        </p>
      </Card>

      <Card title="Keys">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Prefix</th><th>Name</th><th>Created</th><th>Last used</th>
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-b last:border-0">
                <td className="py-2 font-mono">{k.prefix}…</td>
                <td>{k.name ?? "—"}</td>
                <td>{k.createdAt.toLocaleString()}</td>
                <td>{k.lastUsedAt ? k.lastUsedAt.toLocaleString() : "never"}</td>
              </tr>
            ))}
            {keys.length === 0 && <tr><td colSpan={4} className="py-2 text-gray-500">No keys yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
