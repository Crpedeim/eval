/**
 * USD per 1M tokens. Output prices include thinking tokens (the providers bill them as output).
 *
 * Sources, recorded per model below. Gemini rows were checked on Google's own pricing page,
 * https://ai.google.dev/gemini-api/docs/pricing (served from aistudio.google.com/docs/pricing),
 * on 2026-11-17, Paid Tier, Standard (not Batch / Flex / Priority) rates.
 */
type Rate = { input: number; output: number };

type Price = Rate & {
  /** Rate for a call whose prompt is larger than `overTokens` tokens. */
  long?: Rate & { overTokens: number };
  /** Date-scheduled price changes, oldest first; each applies from `from` (UTC) on. */
  changes?: (Rate & { from: string })[];
  source: string;
};

const GOOGLE = "ai.google.dev/gemini-api/docs/pricing, checked 2026-11-17";

export const PRICING: Record<string, Price> = {
  "claude-sonnet-4-6": { input: 3, output: 15, source: "original table in this repo (not re-checked)" },
  "gpt-4o": { input: 2.5, output: 10, source: "original table in this repo (not re-checked)" },
  // Google: deprecated; from 2026-12-01 requests route to gemini-3.5-flash-lite and bill at its rates.
  "gemini-2.5-flash": { input: 0.3, output: 2.5, source: GOOGLE },
  // Google: $2.00 / $12.00 for prompts <= 200k tokens, $4.00 / $18.00 above.
  "gemini-3.1-pro-preview": {
    input: 2, output: 12,
    long: { overTokens: 200_000, input: 4, output: 18 },
    source: GOOGLE,
  },
  // Google: $0.75 / $3.75 through 2026-12-31, $1.50 / $7.50 starting 2027-01-01.
  "gemini-3.8-flash": {
    input: 0.75, output: 3.75,
    changes: [{ from: "2027-01-01T00:00:00Z", input: 1.5, output: 7.5 }],
    source: GOOGLE,
  },
  // Embedding models bill input only.
  "gemini-embedding-001": { input: 0.15, output: 0, source: GOOGLE },
};

/** The rate a call is billed at: by date (scheduled changes), then by prompt size (long-context tier). */
export function rateFor(model: string, promptTokens: number, at: Date = new Date()): Rate | null {
  const p = PRICING[model];
  if (!p) return null;
  let rate: Rate = { input: p.input, output: p.output };
  for (const c of p.changes ?? []) if (at.getTime() >= Date.parse(c.from)) rate = { input: c.input, output: c.output };
  if (p.long && promptTokens > p.long.overTokens) rate = { input: p.long.input, output: p.long.output };
  return rate;
}

/** Cost of one call. Unknown models cost 0. `at` defaults to now (the time the call is recorded). */
export function computeCostUsd(model: string, prompt: number, completion: number, at: Date = new Date()) {
  const r = rateFor(model, prompt, at);
  if (!r) return 0;
  return (prompt / 1_000_000) * r.input + (completion / 1_000_000) * r.output;
}
