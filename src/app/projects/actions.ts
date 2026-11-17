"use server";

import { redirect } from "next/navigation";
import { getScope, UnauthorizedError } from "@/lib/tenancy";

export async function createProjectAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100) || "Default";
  let target: string;
  try {
    const scope = await getScope();
    const project = await scope.createProject(name);
    target = `/projects/${project.id}/keys`;
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    throw e;
  }
  redirect(target);
}
