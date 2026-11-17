import Link from "next/link";
import { redirect } from "next/navigation";
import { getScope, UnauthorizedError } from "@/lib/tenancy";
import { createProjectAction } from "./actions";

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
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <h1 className="text-2xl font-semibold">Projects</h1>
      {projects.length === 0 && <p className="text-gray-600">No projects yet. Create one to get an API key.</p>}
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="underline">{p.name}</Link>
          </li>
        ))}
      </ul>
      <form action={createProjectAction} className="flex items-center gap-2 text-sm">
        <input name="name" placeholder="Project name" maxLength={100} className="rounded border px-2 py-1" />
        <button type="submit" className="rounded bg-black px-3 py-1 text-white">Create project</button>
      </form>
    </main>
  );
}
