import { z } from "zod";
import type { EvaluatorImpl } from "./types";

const AssertionConfig = z.object({
  rule: z.enum(["non_empty", "json_valid", "contains", "regex", "max_length"]),
  value: z.string().optional(),
  limit: z.number().int().positive().optional(),
});

export const assertionEvaluator: EvaluatorImpl<z.infer<typeof AssertionConfig>> = {
  type: "assertion",
  configSchema: AssertionConfig,

  async run(ctx, config) {
    let passed = false;
    let reasoning = "";

    switch (config.rule) {
      case "non_empty":
        passed = ctx.output.trim().length > 0;
        reasoning = passed ? "output is non-empty" : "output is empty";
        break;

      case "json_valid":
        try {
          JSON.parse(ctx.output);
          passed = true;
          reasoning = "output parses as JSON";
        } catch {
          passed = false;
          reasoning = "output is not valid JSON";
        }
        break;

      case "contains":
        if (!config.value) throw new Error("`contains` requires `value`");
        passed = ctx.output.includes(config.value);
        reasoning = `substring ${passed ? "found" : "not found"}`;
        break;

      case "regex":
        if (!config.value) throw new Error("`regex` requires `value`");
        passed = new RegExp(config.value).test(ctx.output);
        reasoning = `pattern ${passed ? "matched" : "did not match"}`;
        break;

      case "max_length":
        if (!config.limit) throw new Error("`max_length` requires `limit`");
        passed = ctx.output.length <= config.limit;
        reasoning = `length ${ctx.output.length} vs limit ${config.limit}`;
        break;
    }

    return { score: passed ? 1 : 0, passed, reasoning };
  },
};