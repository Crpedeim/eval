import { z } from "zod";
import type { EvaluatorType } from "@/generated/prisma/client";

export type EvalContext = {
  input: string;
  output: string;
  model: string;
  metadata: unknown;
};

export type EvalResult = {
  score: number;      // 0..1
  passed: boolean;
  reasoning: string;
};

export interface EvaluatorImpl<C = unknown> {
  type: EvaluatorType;
  configSchema: z.ZodType<C>;
  run(ctx: EvalContext, config: C): Promise<EvalResult>;
}