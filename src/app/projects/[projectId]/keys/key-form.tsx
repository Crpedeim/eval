"use client";

import { useActionState } from "react";
import type { KeyState } from "./actions";

export function KeyForm({ action }: { action: (prev: KeyState, formData: FormData) => Promise<KeyState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="space-y-3">
      <form action={formAction} className="flex items-center gap-2 text-sm">
        <input name="name" placeholder="Key name (optional)" maxLength={100} className="rounded border px-2 py-1" />
        <button type="submit" disabled={pending} className="rounded bg-black px-3 py-1 text-white disabled:opacity-50">
          {pending ? "Creating…" : "Create API key"}
        </button>
      </form>
      {state.key && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium">Copy this key now. It is not stored and will not be shown again.</p>
          <code className="mt-2 block break-all rounded bg-white p-2 font-mono">{state.key}</code>
        </div>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
