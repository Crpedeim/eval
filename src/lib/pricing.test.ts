import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCostUsd, rateFor } from "./pricing";

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test("gemini-3.1-pro-preview: <=200k prompt at $2/$12, above at $4/$18", () => {
  close(computeCostUsd("gemini-3.1-pro-preview", 3000, 300), 0.006 + 0.0036);
  assert.deepEqual(rateFor("gemini-3.1-pro-preview", 200_000), { input: 2, output: 12 });
  assert.deepEqual(rateFor("gemini-3.1-pro-preview", 200_001), { input: 4, output: 18 });
});

test("gemini-3.8-flash: $0.75/$3.75 through 2026-12-31, $1.50/$7.50 from 2027-01-01", () => {
  assert.deepEqual(rateFor("gemini-3.8-flash", 10, new Date("2026-12-31T23:59:59Z")), { input: 0.75, output: 3.75 });
  assert.deepEqual(rateFor("gemini-3.8-flash", 10, new Date("2027-01-01T00:00:00Z")), { input: 1.5, output: 7.5 });
  close(computeCostUsd("gemini-3.8-flash", 1200, 80, new Date("2026-11-17")), 0.0009 + 0.0003);
});

test("unknown model costs 0", () => {
  assert.equal(computeCostUsd("not-a-model", 1000, 1000), 0);
  assert.equal(rateFor("not-a-model", 1), null);
});
