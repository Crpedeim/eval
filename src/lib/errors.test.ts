import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, PermanentError, TransientError } from "./errors";

const geminiError = (code: number, status: string, message: string) =>
  new Error(JSON.stringify({ error: { code, message, status } }));

test("402 credits depleted is permanent even though it says RESOURCE_EXHAUSTED", () => {
  const e = geminiError(402, "RESOURCE_EXHAUSTED", "Your prepayment credits are depleted.");
  assert.ok(classify(e) instanceof PermanentError);
  assert.ok(classify(Object.assign(new Error("x"), { status: 402 })) instanceof PermanentError);
});

test("429 RESOURCE_EXHAUSTED rate limit stays transient", () => {
  const e = geminiError(429, "RESOURCE_EXHAUSTED", "Quota exceeded for requests per minute.");
  assert.ok(classify(e) instanceof TransientError);
});

test("invalid API key is permanent; network reset is transient", () => {
  assert.ok(classify(geminiError(400, "INVALID_ARGUMENT", "API key not valid.")) instanceof PermanentError);
  assert.ok(classify(Object.assign(new Error("reset"), { code: "ECONNRESET" })) instanceof TransientError);
});
