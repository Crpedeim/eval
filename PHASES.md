# PHASES

A log of each phase of the 2026-11-17 work: what was done and what was measured. Every
number here comes from a command that was run; nothing is estimated.

## Phase 0: carry over the last session's RAG work

- The RAG work was already committed and pushed on `claude/sweet-pascal-lq5x1e`
  (`1ca4386`, same SHA locally and on `origin`); the main checkout had no uncommitted changes.
  This branch was fast-forwarded onto it, so nothing needed a new commit.

## Phase 1: clean up what a visitor sees

Done:
- `/` is now a landing page (`src/app/page.tsx`): what the platform does, Sign in links to
  `/login`, a link to the tracing API doc, and six screenshots served from
  `public/screenshots/` (copied from `docs/`; the RAG trace one cropped to the span and
  citation cards). The create-next-app SVGs were deleted.
- Layout title "Create Next App" → "Eval Platform: LLM evaluation and observability", with a
  real description.
- Duplicate trace detail route removed: `src/app/traces/[traceId]` deleted. The one URL is
  `/projects/:projectId/traces/:traceId`; it now also returns 404 if the trace belongs to a
  different project than the URL says. The three links that pointed at `/traces/:id` (traces
  list, RAG ask redirect, eval-run page) were updated.
- ESLint: the 4 errors in `scripts/check-models.ts` (`any` casts) and the warning in
  `src/worker/index.ts` (unused `TransientError` import) fixed.
- "Run evaluation" on the RAG page: pick a bundled dataset (any `datasets/rag/*.json` or
  `datasets/rag/<dir>/questions.json` that validates) or upload a JSON file in the same format,
  choose k, submit. It calls the same `createRagEvalRun` as `npm run rag:eval`, records the
  model config with `via: "ui"`, refuses while another run in the project still has unsettled
  questions, caps uploads at 1 MB / 500 questions, and redirects to the run page, which
  refreshes every 5 s until all items and judge runs have settled.

Measured / checked:
- `npx eslint .`: 0 errors, 0 warnings (was 4 errors + 1 warning).
- `npx tsc --noEmit` clean after `next build` generated the route types.
- `next build`: succeeds, 15 routes (was 16; the duplicate trace route is gone).
- `npm test`: 34 pass, 0 fail; the pgvector integration suite was skipped because no
  `DATABASE_URL` was set on this machine at this point.
- `next start` locally: `/` serves the new title and h1, both sign-in links go to `/login`,
  above-the-fold screenshots load through the Next image optimizer.
- The "Run evaluation" button was not exercised end to end in this phase (no database
  credentials yet); that is checked live in Phase 5.

## Phase 2: finish the RAG feature

### Code (committed before the benchmark ran)

- **Judge usage and cost.** `JudgeProvider.complete` now returns `{ data, usage, latencyMs }`
  (Gemini `usageMetadata`). `llm_judge` turns that into model, prompt tokens, output tokens
  (visible + thinking, since Gemini bills thinking as output), cost from the price table and
  latency, and the worker stores them on the `EvalRun` row (migration
  `20261117120000_judge_usage`). The eval report and UI now show judge cost per answer and
  **cost per eval answer including judges**.
- **Hybrid search.** `searchHybrid` (`src/lib/rag/retrieve.ts`): pgvector cosine top-N and
  Postgres full-text top-N (N = max(4k, 20)) in one SQL statement, merged with reciprocal
  rank fusion, `1/(60 + rank)` per list. The text query ORs the question's stemmed terms
  (`plainto_tsquery` ANDs them, which a full question rarely satisfies) and ranks with
  `ts_rank_cd`, backed by an expression GIN index (migration `20261117130000_chunk_fts`).
  The retrieval mode is stored in each eval run's config and the worker uses the run's mode,
  so vector and hybrid runs can be compared on the same worker. The Run evaluation form has
  a mode selector. 2 new integration tests (RRF ranks, stopword-only query falls back to vectors).
- **Public benchmark set.** HotpotQA, dev split, distractor setting (Yang et al., EMNLP 2018),
  licence **CC BY-SA 4.0** (stated on hotpotqa.github.io and on the Hugging Face dataset card
  `hotpotqa/hotpot_qa`). Downloaded `distractor/validation-00000-of-00001.parquet`
  (27,452,575 bytes; SHA-256 `c20b638c…72f7c6`, equal to the file's LFS object id).
  `scripts/hotpotqa-build.py` samples 150 of the 7,405 questions with seed 20261117:
  127 bridge + 23 comparison, 346 supporting-fact sentences used as evidence (all
  questions have ≥2, so retrieval has to find both hops). Corpus: the 10 context paragraphs
  of every sampled question (2 gold + 8 distractors picked by TF-IDF similarity to the
  question, so they are lexically close), 1,492 unique paragraphs, 822,216 characters, in 6
  markdown files (`## <title>` per paragraph).
  `npx tsx scripts/rag-check-dataset.ts`: 1,561 chunks, **0 of 346 evidence spans missing**
  from every chunk.
- Why HotpotQA: free licence that allows redistribution, gold supporting sentences (exact
  evidence labels, which this platform's recall@k needs), and multi-hop questions with
  hard distractors, unlike the 34 self-written questions where every metric was at or near 1.0.

### Benchmark numbers (run 2026-11-17)

Setup: a Neon branch `bench` copied from production (so production never held benchmark
data), all migrations applied there, two local workers (`batchSize 1` each) on this
machine, generator and judge `gemini-3.8-flash` (generation thinking level LOW), embedder
`gemini-embedding-001` (768-d), k = 5, the project's only evaluators are the two RAG judges.

First, on that Neon branch: `npm test` → **56 pass / 0 fail**, including the 8 pgvector
integration tests (6 existing + 2 hybrid) that had never run against Neon.

Ingestion (`scripts/rag-bench-setup.ts`, through the worker): 6 files → **1,561 chunks**, every
document `ready` on attempt 1, all settled **51.5 s** after the first upload; per file embed
7.6–10.9 s, write 1.8–5.0 s.

Starting the eval run found a real bug: `createRagEvalRun` sent 150 pg-boss jobs one at a time
inside its transaction; against Neon that exceeded the 30 s interactive-transaction timeout
(`P2028`, 31,810 ms) and the run rolled back with nothing written (the transaction did its
job). Fixed by enqueueing all jobs with one `boss.insert` on the same transaction; the
per-trace evaluator enqueue now uses it too. The Run evaluation button had the same bug.

Results (full reports: `datasets/rag/results/hotpotqa-dev-distractor-150-<run>.{md,json}`,
side by side: `datasets/rag/results/hotpotqa-vector-vs-hybrid.md`):

| Metric | vector (`cmwkovirq…`) | hybrid (`cmwkpgb5…`) |
|---|---|---|
| Answered | 150/150, 0 failed | 150/150, 0 failed |
| **Recall@5** (share of evidence sentences in top 5) | **0.974** | 0.774 |
| Both hops in top 5 | 142/150 | 86/150 |
| Hit rate@5 | 1.000 | 0.973 |
| **MRR@5** | **0.972** | 0.784 |
| **Faithfulness** (judge mean / pass@0.7) | 0.997 / 0.993 | 1.000 / 1.000 |
| **Answer relevance** (judge mean / pass@0.7) | **0.913** / 0.913 | 0.647 / 0.647 |
| Answer contains the gold answer (normalised, no model) | 123/150 = 0.820 | 88/150 = 0.587 |
| "I don't know" answers | 12 | 51 |
| **Request latency p50 / p95** | **2,693 / 3,758 ms** | 2,746 / 4,062 ms |
| retrieve step p50 / p95 | 643 / 972 ms | 664 / 942 ms |
| Cost per answer (retrieve + generate) | $0.000828 | $0.000892 |
| Judge cost per answer (2 judge calls) | $0.003557 | $0.003748 |
| **Cost per eval answer incl. judges** | **$0.004385** | $0.004640 |
| Total for the run incl. judges | $0.6578 | $0.6960 |
| Enqueue → all 300 judge runs settled | 961 s | 956 s |

Per question, hybrid had lower recall@5 than vector on 58, higher on 1, equal on 91.

**Decision: keep vector-only as the default** (`DEFAULT_RETRIEVAL = "vector"`); hybrid stays
selectable per eval run and via `RAG_RETRIEVAL`. Why hybrid lost (`scripts/rag-diagnose-hybrid.ts`
on the 58 worse questions): the second-hop paragraph of a bridge question shares few words with
the question, so full-text search ranks it 6th–57th (in the 6 cases inspected), while HotpotQA's distractors were chosen
by TF-IDF similarity to the question and rank near the top of the text list. Equal-weight RRF
then lifts distractors that sit mid-list in both rankings above gold chunks that are top-4 in
the vector list only. This is a property of this dataset (lexically adversarial distractors) as
much as of hybrid search; it was not tuned further, to avoid fitting the method to the test set.

Before vs after, same pipeline:

| | project-docs-v1 (34 self-written, 2026-11-16) | HotpotQA 150, vector (2026-11-17) |
|---|---|---|
| Recall@5 | 1.000 | 0.974 |
| MRR@5 | 0.941 | 0.972 |
| Faithfulness / relevance | 1.00 / 1.00 | 0.997 / 0.913 |
| "I don't know" | 0 | 12 |
| Request p50 / p95 | 2,045 / 3,442 ms | 2,693 / 3,758 ms |
| Cost per answer | $0.000932 (judges not costed then) | $0.000828; **$0.004385 incl. judges** |

Judge calls are 81% of the cost of an evaluated answer ($0.003557 of $0.004385): each judge
call reads the full prompt with all 5 passages (316,516 judge input tokens and 78,980 judge
output tokens incl. thinking for 300 calls).

Limits of this benchmark: retrieval is still close to the ceiling because the corpus is only
the 1,492 paragraphs attached to the sampled questions (in HotpotQA's "fullwiki" setting it
would be all of Wikipedia); one run per mode, no confidence intervals; generator and judge
are the same model; latency was measured from this machine (local worker → Gemini API and
→ Neon us-east-1), not from Cloud Run.

## Phase 3: publish the tracing contract

Done:
- `docs/TRACING_API.md`: endpoint, auth header and key format, every trace and span field
  with type / required / default, span rules, multi-agent guidance, cost rules, every status
  code with its exact JSON body, a multi-agent curl example and a minimal one.
- The request schema moved to `src/lib/trace-input.ts` (single source for the route and the
  tests). A test (`src/lib/trace-input.test.ts`) parses the doc's own examples with the real
  schema and checks the doc's stated cost and 422 body, so the doc cannot silently drift.
  It caught an arithmetic error in my first draft of the example (0.0102 → 0.0108).
- Spans can now represent a multi-agent run: optional `id` and `parentId` (validated: unique
  ids, parent must exist in the request, no cycles), `kind` (agent / llm / tool / …),
  `status` (ok / error), plus per-span `model`, tokens, `latencyMs`, `startedAt` and
  server-computed cost. Limit raised from 100 to 500 spans. Migration
  `20261117140000_span_tree`. The trace page draws the span tree indented under parents.
- Trace cost with spans is now the sum of span costs (before, it ignored the spans and used
  the trace-level tokens). The response adds `costUsd` and `spans`. Unexpected failures
  return `500 {"error":"internal error"}` instead of an unhandled exception.
- Price table (`src/lib/pricing.ts`) records a source per model and supports long-context
  tiers and dated price changes. Checked on Google's pricing page on 2026-11-17 (Paid tier,
  Standard): `gemini-3.1-pro-preview` $2.00 in / $12.00 out per 1M for prompts ≤200k tokens,
  $4.00 / $18.00 above; `gemini-3.8-flash` $0.75 / $3.75 through 2026-12-31 and
  $1.50 / $7.50 from 2027-01-01; `gemini-2.5-flash` $0.30 / $2.50 (Google marks it
  deprecated); `gemini-embedding-001` $0.15 in. The last session's note that 3.8 Flash's
  price "came from third-party pages" is now resolved: the official page confirms it.
- Self-serve onboarding, needed for any outside integration: `/projects` can create a
  project (a first-time user gets a personal organization as owner; new projects get the two
  RAG judges), and `/projects/:id/keys` creates API keys and shows each one once.

Checked: `npm test` 48 pass / 0 fail (pgvector suite skipped: no database on this machine
yet); `tsc` and `eslint` clean. The curl example is run against the live deployment in Phase 5.
