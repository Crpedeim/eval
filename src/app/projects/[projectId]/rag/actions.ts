"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getScope, UnauthorizedError, ForbiddenError } from "@/lib/tenancy";
import { documentFromFile, UploadError } from "@/lib/rag/documents";
import { classify } from "@/lib/errors";

function back(projectId: string, params: Record<string, string>) {
  return `/projects/${projectId}/rag?${new URLSearchParams(params).toString()}`;
}

/** Upload → store + enqueue ingestion. projectId is bound server-side, then re-checked. */
export async function uploadDocumentAction(projectId: string, formData: FormData) {
  let target: string;
  try {
    const scope = await getScope();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new UploadError("choose a file");
    const doc = await scope.createDocument(projectId, await documentFromFile(file));
    revalidatePath(`/projects/${projectId}/rag`);
    target = back(projectId, { uploaded: doc.name });
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) redirect("/projects");
    if (e instanceof UploadError) target = back(projectId, { error: e.message });
    else throw e;
  }
  redirect(target);
}

/** Ask → retrieve + generate + record trace, then show the trace. */
export async function askAction(projectId: string, formData: FormData) {
  const question = String(formData.get("question") ?? "").trim().slice(0, 2000);
  if (!question) redirect(back(projectId, { error: "enter a question" }));
  const k = Math.min(Math.max(Number(formData.get("k") ?? 5) || 5, 1), 20);

  let target: string;
  try {
    const scope = await getScope();
    const r = await scope.askRag(projectId, question, k);
    target = `/traces/${r.traceId}`;
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) redirect("/projects");
    target = back(projectId, { error: `RAG request failed: ${classify(e).message}` });
  }
  redirect(target);
}
