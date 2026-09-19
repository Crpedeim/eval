import type { EvaluatorImpl } from "./types";
import { assertionEvaluator } from "./assertion";
import { llmJudgeEvaluator } from "./llm-judge";

const REGISTRY = new Map<string, EvaluatorImpl<never>>([
  [assertionEvaluator.type, assertionEvaluator as EvaluatorImpl<never>],
  [llmJudgeEvaluator.type, llmJudgeEvaluator as EvaluatorImpl<never>],
]);

export function getEvaluator(type: string) {
  return REGISTRY.get(type) ?? null;
}