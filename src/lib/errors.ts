export class TransientError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "TransientError";
  }
}

export class PermanentError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "PermanentError";
  }
}

/** Map an unknown thrown value into the taxonomy. Default to permanent. */
export function classify(err: unknown): TransientError | PermanentError {
  if (err instanceof TransientError || err instanceof PermanentError) return err;

  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code;


  const msg = String((err as Error)?.message ?? "");

  // Gemini surfaces these in the message when not on a `status` field.
  if (/RESOURCE_EXHAUSTED|rate.?limit|429/i.test(msg)) {
    return new TransientError("judge rate limited", err);
  }
  if (/UNAVAILABLE|overloaded|503|500|deadline/i.test(msg)) {
    return new TransientError("judge unavailable", err);
  }

  // Rate limits and server-side faults: the same request may well succeed later.
  if (status === 429 || (typeof status === "number" && status >= 500)) {
    return new TransientError(`upstream ${status}`, err);
  }

  // Network-level faults.
  if (["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EAI_AGAIN"].includes(code ?? "")) {
    return new TransientError(`network ${code}`, err);
  }

  // 4xx (other than 429), bad config, parse failures: identical input, identical failure.
  return new PermanentError((err as Error)?.message ?? "unknown error", err);


  
}