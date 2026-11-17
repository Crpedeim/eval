import { z } from "zod";
import type { EvaluatorType } from "@/generated/prisma/client";

export type EvalContext = {
  input: string;
  output: string;
  model: string;
  metadata: unknown;
};

/** Model usage of an evaluator that calls a model (llm_judge); cost from the price table. */
export type EvalUsage = {
  model: string;
  promptTokens: number;
  /** Output tokens including hidden reasoning tokens, i.e. everything billed as output. */
  completionTokens: number;
  costUsd: number;
  latencyMs: number;
};

export type EvalResult = {
  score: number;      // 0..1
  passed: boolean;
  reasoning: string;
  usage?: EvalUsage;
};

export interface EvaluatorImpl<C = unknown> {
  type: EvaluatorType;
  configSchema: z.ZodType<C>;
  run(ctx: EvalContext, config: C): Promise<EvalResult>;
}