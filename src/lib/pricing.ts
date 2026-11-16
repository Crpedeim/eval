// USD per 1M tokens. Fill in real numbers per model.
// Gemini rates are Google's paid-tier list prices as of 2026-11 (embedding models bill input only).
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "gpt-4o": { input: 2.5, output: 10 },
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-embedding-001": { input: 0.15, output: 0 },
};

export function computeCostUsd(model: string, prompt: number, completion: number) {
  const p = PRICING[model];
  if (!p) return 0;
  return (prompt / 1_000_000) * p.input + (completion / 1_000_000) * p.output;
}
