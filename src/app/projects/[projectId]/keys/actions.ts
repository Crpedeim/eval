"use server";

import { revalidatePath } from "next/cache";
import { getScope } from "@/lib/tenancy";

export type KeyState = { key?: string; error?: string };

/** Creates a key and returns it to the form once; it is never stored or shown again. */
export async function createKeyAction(projectId: string, _prev: KeyState, formData: FormData): Promise<KeyState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 100);
  try {
    const scope = await getScope();
    const key = await scope.createApiKey(projectId, name);
    revalidatePath(`/projects/${projectId}/keys`);
    return { key };
  } catch {
    return { error: "could not create the key (signed out, or no access to this project)" };
  }
}
