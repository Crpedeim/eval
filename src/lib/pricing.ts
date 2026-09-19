// USD per 1M tokens. Fill in real numbers per model.
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "gpt-4o": { input: 2.5, output: 10 },
};

export function computeCostUsd(model: string, prompt: number, completion: number) {
  const p = PRICING[model];
  if (!p) return 0;
  return (prompt / 1_000_000) * p.input + (completion / 1_000_000) * p.output;
}