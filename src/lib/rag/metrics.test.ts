import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  matchedEvidence, mean, normalize, parseCitations, percentile, recallAtK,
  reciprocalRank, relevantRanks, tokensPerSecond,
} from "./metrics";
import { computeCostUsd } from "../pricing";

const docs = [
  "The worker claims an EvalRun with a conditional update.",
  "Backoff is exponential with **equal jitter**.",
  "Cross-tenant requests return 404, not 403.",
  "unrelated text about mangoes",
];

describe("evidence matching", () => {
  test("normalize ignores case, markdown markers and whitespace runs", () => {
    assert.equal(normalize("  Equal\n\n **Jitter** `x` "), "equal jitter x");
  });

  test("matchedEvidence finds spans after normalisation", () => {
    assert.deepEqual(matchedEvidence(docs[1], ["exponential with equal jitter", "404"]), [0]);
  });

  test("relevantRanks are 1-based", () => {
    assert.deepEqual(relevantRanks(docs, ["return 404", "conditional update"]), [1, 3]);
  });
});

describe("recall@k", () => {
  test("fraction of evidence spans found in the top k", () => {
    const ev = ["conditional update", "return 404, not 403"];
    assert.equal(recallAtK(docs, ev, 1), 0.5);
    assert.equal(recallAtK(docs, ev, 2), 0.5);
    assert.equal(recallAtK(docs, ev, 3), 1);
  });

  test("two chunks matching the same span count once", () => {
    assert.equal(recallAtK(["a jitter b", "c jitter d"], ["jitter", "missing span"], 2), 0.5);
  });

  test("requires evidence", () => {
    assert.throws(() => recallAtK(docs, [], 3));
  });
});

describe("reciprocal rank / MRR", () => {
  test("1/rank of the first relevant chunk", () => {
    assert.equal(reciprocalRank(docs, ["conditional update"]), 1);
    assert.equal(reciprocalRank(docs, ["404"]), 1 / 3);
  });
  test("0 when nothing relevant is retrieved", () => {
    assert.equal(reciprocalRank(docs, ["not in any chunk"]), 0);
  });
  test("MRR is the mean of reciprocal ranks", () => {
    const rr = [["conditional update"], ["404"], ["nope"]].map((e) => reciprocalRank(docs, e));
    assert.ok(Math.abs(mean(rr)! - (1 + 1 / 3 + 0) / 3) < 1e-12);
  });
});

describe("aggregates", () => {
  test("percentile matches percentile_cont interpolation", () => {
    assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
    assert.equal(percentile([10, 20, 30, 40, 50], 0.95), 48);
    assert.equal(percentile([], 0.5), null);
    assert.equal(mean([]), null);
  });

  test("tokensPerSecond", () => {
    assert.equal(tokensPerSecond(150, 1500), 100);
    assert.equal(tokensPerSecond(10, 0), null);
  });

  test("cost for Gemini models from the price table", () => {
    // 1000 prompt tokens at $0.30/M + 100 output tokens at $2.50/M
    assert.ok(Math.abs(computeCostUsd("gemini-2.5-flash", 1000, 100) - 0.00055) < 1e-12);
    assert.equal(computeCostUsd("unknown-model", 1000, 100), 0);
  });
});

describe("parseCitations", () => {
  test("handles [n], [a][b] and [a, b]; dedupes and sorts", () => {
    assert.deepEqual(parseCitations("Yes [3]. Also [1][3] and [2, 4].", 5), [1, 2, 3, 4]);
  });
  test("drops out-of-range numbers", () => {
    assert.deepEqual(parseCitations("see [0] and [6] and [5]", 5), [5]);
  });
  test("no citations", () => {
    assert.deepEqual(parseCitations("I don't know based on the provided documents.", 5), []);
  });
});
