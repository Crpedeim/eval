import { z } from "zod";
import type { EvaluatorImpl } from "./types";
import { getJudgeProvider } from "../providers";

const JudgeConfig = z.object({
  rubric: z.string().min(1),
  threshold: z.number().min(0).max(1).default(0.7),
});

const JudgeResponse = z.object({
  reasoning: z.string(),
  score: z.number().min(0).max(1),
});

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reasoning: { type: "string" },
    score: { type: "number" },
  },
  required: ["reasoning", "score"],
};

const SYSTEM = `You are a strict evaluator of AI outputs.
Judge ONLY against the rubric provided. Ignore length and style unless the rubric mentions them.
Write your reasoning FIRST, then assign a score from 0.0 to 1.0.
Be calibrated: 1.0 means fully satisfies the rubric, 0.5 means partially, 0.0 means fails.`;

export const llmJudgeEvaluator: EvaluatorImpl<z.infer<typeof JudgeConfig>> = {
  type: "llm_judge",
  configSchema: JudgeConfig,

  async run(ctx, config) {
    const provider = getJudgeProvider();

    const prompt = [
      `RUBRIC:\n${config.rubric}`,
      `INPUT GIVEN TO THE MODEL:\n${ctx.input}`,
      `OUTPUT TO EVALUATE:\n${ctx.output}`,
    ].join("\n\n---\n\n");

    const raw = await provider.complete({ system: SYSTEM, prompt, schema: RESPONSE_SCHEMA });
    const parsed = JudgeResponse.safeParse(raw);

    if (!parsed.success) {
      throw new Error(`judge returned unparseable response: ${parsed.error.message}`);
    }

    return {
      score: parsed.data.score,
      passed: parsed.data.score >= config.threshold,
      reasoning: parsed.data.reasoning,
    };
  },
};