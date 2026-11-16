/**
 * Pure retrieval / generation metrics. No database, no network — unit tested directly.
 *
 * Relevance is defined by labelled evidence spans rather than chunk ids: a chunk is
 * relevant if it contains (after normalisation) one of the question's evidence spans.
 * Labels therefore survive re-chunking with different sizes — chunk ids would not.
 */

/** Lowercase, drop markdown emphasis/code markers, collapse whitespace. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Indices (into `evidence`) of the spans this chunk contains. */
export function matchedEvidence(chunk: string, evidence: string[]): number[] {
  const c = normalize(chunk);
  return evidence.flatMap((e, i) => (c.includes(normalize(e)) ? [i] : []));
}

/** 1-based ranks of retrieved chunks that contain any evidence span. */
export function relevantRanks(retrieved: string[], evidence: string[]): number[] {
  return retrieved.flatMap((chunk, i) => (matchedEvidence(chunk, evidence).length ? [i + 1] : []));
}

/**
 * recall@k = |evidence spans found anywhere in the top-k| / |evidence spans|.
 * With one span per question this equals hit-rate@k.
 */
export function recallAtK(retrieved: string[], evidence: string[], k: number): number {
  if (evidence.length === 0) throw new Error("recall@k needs at least one evidence span");
  const found = new Set(retrieved.slice(0, k).flatMap((c) => matchedEvidence(c, evidence)));
  return found.size / evidence.length;
}

/** 1 / rank of the first relevant chunk, or 0 if none is retrieved. MRR is its mean. */
export function reciprocalRank(retrieved: string[], evidence: string[]): number {
  const [first] = relevantRanks(retrieved, evidence);
  return first ? 1 / first : 0;
}

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

/** Linear-interpolated percentile (same definition as Postgres percentile_cont). */
export function percentile(xs: number[], p: number): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

/**
 * Output tokens per second of wall-clock generation time. Non-streaming, so this is
 * end-to-end throughput (time-to-first-token included), not pure decode speed.
 */
export function tokensPerSecond(outputTokens: number, latencyMs: number): number | null {
  if (latencyMs <= 0) return null;
  return outputTokens / (latencyMs / 1000);
}

/** Rough token estimate for providers that don't report usage (Gemini embeddings). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Citation markers like [2], [1][3] or [1, 3] → sorted unique passage numbers within 1..n.
 * Numbers outside the range are dropped: a model citing [7] of 5 passages cited nothing real.
 */
export function parseCitations(answer: string, n: number): number[] {
  const found = new Set<number>();
  for (const m of answer.matchAll(/\[(\d+(?:\s*,\s*\d+)*)\]/g)) {
    for (const part of m[1].split(",")) {
      const v = Number(part.trim());
      if (Number.isInteger(v) && v >= 1 && v <= n) found.add(v);
    }
  }
  return [...found].sort((a, b) => a - b);
}
