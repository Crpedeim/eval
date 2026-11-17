import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeUsage } from "./llm-judge";
import { computeCostUsd } from "../pricing";

test("judge cost bills thinking tokens as output", () => {
  const u = judgeUsage("gemini-3.8-flash", { promptTokens: 1000, completionTokens: 60, thoughtsTokens: 240 }, 1234);
  assert.equal(u.promptTokens, 1000);
  assert.equal(u.completionTokens, 300);
  assert.equal(u.latencyMs, 1234);
  assert.equal(u.costUsd, computeCostUsd("gemini-3.8-flash", 1000, 300));
  assert.ok(u.costUsd > 0);
});

test("unknown judge model costs 0 but keeps token counts", () => {
  const u = judgeUsage("some-unpriced-model", { promptTokens: 10, completionTokens: 5, thoughtsTokens: 0 }, 1);
  assert.equal(u.costUsd, 0);
  assert.equal(u.completionTokens, 5);
});
