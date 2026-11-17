"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getScope, UnauthorizedError, ForbiddenError, EvalInProgressError } from "@/lib/tenancy";
import { documentFromFile, UploadError } from "@/lib/rag/documents";
import { classify } from "@/lib/errors";
import { RagDataset } from "@/lib/rag/eval";
import { bundledDataset } from "@/lib/rag/datasets";
import { retrievalMode } from "@/lib/rag/retrieve";

const MAX_DATASET_BYTES = 1024 * 1024;
const MAX_QUESTIONS = 500;

class DatasetError extends Error {}

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
    target = `/projects/${projectId}/traces/${r.traceId}`;
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) redirect("/projects");
    target = back(projectId, { error: `RAG request failed: ${classify(e).message}` });
  }
  redirect(target);
}

/**
 * Run evaluation → one RagEvalRun + one worker job per question (same code path as
 * `npm run rag:eval`). The dataset is either a bundled one, looked up by name, or an
 * uploaded JSON file in the same format as datasets/rag/questions.json.
 */
export async function runEvalAction(projectId: string, formData: FormData) {
  const k = Math.min(Math.max(Number(formData.get("k") ?? 5) || 5, 1), 20);
  let target: string;
  try {
    const scope = await getScope();
    let dataset: RagDataset | null = null;
    const file = formData.get("file");
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_DATASET_BYTES) throw new DatasetError("dataset file is larger than 1 MB");
      let json: unknown;
      try { json = JSON.parse(await file.text()); } catch { throw new DatasetError("dataset file is not valid JSON"); }
      const parsed = RagDataset.safeParse(json);
      if (!parsed.success) throw new DatasetError(`dataset does not match the schema: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      dataset = parsed.data;
    } else {
      const name = String(formData.get("dataset") ?? "");
      dataset = bundledDataset(name);
      if (!dataset) throw new DatasetError(`unknown dataset "${name}"`);
    }
    if (dataset.questions.length > MAX_QUESTIONS) throw new DatasetError(`at most ${MAX_QUESTIONS} questions per run`);
    const { runId } = await scope.startRagEval(projectId, dataset, k, retrievalMode(formData.get("retrieval")));
    revalidatePath(`/projects/${projectId}/rag`);
    target = `/projects/${projectId}/rag/evals/${runId}`;
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect("/login");
    if (e instanceof ForbiddenError) redirect("/projects");
    if (e instanceof DatasetError || e instanceof EvalInProgressError) target = back(projectId, { error: e.message });
    else target = back(projectId, { error: `could not start the eval run: ${classify(e).message}` });
  }
  redirect(target);
}
