import Link from "next/link";
import { redirect } from "next/navigation";
import { getScope, UnauthorizedError } from "@/lib/tenancy";

export default async function ProjectsPage() {
  let scope;
  try {
    scope = await getScope();
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    throw e;
  }

  const projects = await scope.projects();

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      {projects.length === 0 && <p>No projects. Are you a member of an org?</p>}
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="underline">{p.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}