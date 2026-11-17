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

## Phase 4: move production from Railway to Google Cloud Run (same Neon database)

What ran, in order (2026-11-17, GCP project `gen-lang-client-0005933941`, region `us-central1`):

1. **Backup.** The user created a branch of the production Neon branch in the Neon console
   before anything touched the database, plus a separate `bench` branch for Phase 2. I then
   took a read-only row-count snapshot of production: Postgres 18.7, pgvector 0.8.7
   available but not installed, 3 migrations applied, 5,016 traces, 15,030 eval runs, 4 users,
   3 organizations, 4 projects, 4 API keys, 7 evaluators, 0 queued jobs.
2. **Secrets** in Secret Manager: `eval-database-url` (pooled), `eval-direct-url`,
   `eval-auth-secret`, `eval-auth-github-id`, `eval-auth-github-secret`; the Gemini key comes
   from the project's existing `gemini-api-key` secret. Values were checked for stray CR/LF
   (none; byte lengths equal the `.env` values). Runtime identity: the project's default
   compute service account, granted `secretAccessor` on exactly these secrets.
3. **Image** built by Cloud Build into Artifact Registry `eval/eval-platform` (463 MB).
4. **Migrations** on production by the Cloud Run job `eval-migrate` (`prisma migrate deploy`,
   DIRECT_URL): applied `20261116120000_rag`, `20261117120000_judge_usage`,
   `20261117130000_chunk_fts`, `20261117140000_span_tree`; it ran `CREATE EXTENSION vector`.
   After: pgvector **0.8.7 installed**, 7 migrations, and **every pre-existing table has exactly
   the same row count as before** (the only differences are the new, empty RAG tables).
5. **Web**: service `eval-web`, min 0, max 3, 1 vCPU / 1 GiB, concurrency 40, startup CPU
   boost, `AUTH_URL` = the deterministic URL https://eval-web-827630707333.us-central1.run.app.
6. **Railway worker stopped first.** In the Railway dashboard the worker is project
   `fabulous-freedom`, service `eval` (start command `npm run worker`); it showed "There is
   no active deployment for this service", every past deployment REMOVED, and the trial is
   expired, so it cannot deploy. I switched off its "Auto deploy" from `main`, so merging this
   branch cannot restart it. The web service (`impartial-charm` / `eval`,
   `eval-production-fd70.up.railway.app`) is offline too; its auto-deploy was already off.
   With that confirmed, and the user's explicit go-ahead, the Cloud Run worker was started.
7. **Worker**: Cloud Run **worker pool** `eval-worker`, manual scaling, 1 instance, 1 vCPU,
   512 MiB. Worker pools are available in this project (GA `gcloud run worker-pools`; on this
   Windows machine gcloud's default Python lacked `grpc`, the SDK's bundled Python has it, and
   the script switches automatically). 0.5 vCPU was tried for cost and **rejected by the
   API** ("Total cpu < 1 is not supported ... with cpu always allocated"), so 1 vCPU is the
   floor. Monthly cost and the comparison with an always-on service: `deploy/CLOUD_RUN.md`
   ($30.75 per 30 days at list price vs $49.25 for the service alternative).
8. **GitHub sign-in.** The `.env` credentials belong to the GitHub App `eval-platform-dev`
   (not the classic OAuth app, and not the `eval-platform` GitHub App). Signing in on Cloud
   Run first failed with GitHub's "redirect_uri is not associated with this application",
   as expected; I added `https://eval-web-827630707333.us-central1.run.app/api/auth/callback/github`
   as a third redirect URI (localhost and Railway kept) and set its homepage to the Cloud Run
   URL, with the user's choice of app. Sign-in on the live URL then worked.

Files: `deploy/deploy_cloud_run.sh` (steps backup, apis, secrets, image, migrate, web, worker,
status; the worker step refuses to run without `RAILWAY_WORKER_STOPPED=yes`),
`deploy/CLOUD_RUN.md`, `Dockerfile` (roles web/worker/migrate, OpenSSL for the Prisma CLI),
`.gitattributes` (LF), `.gcloudignore`, `.env.example`. The worker now stops pg-boss
gracefully on SIGTERM; a redeploy showed the old revision log `worker.stopping` 9 s after the
new one started listening (two Cloud Run revisions overlapping briefly is safe: pg-boss
hands each job to one consumer and every handler claims its row idempotently).

## Phase 5: verify live

Live URL: **https://eval-web-827630707333.us-central1.run.app**

Checked on the live deployment (production Neon, Cloud Run web + worker pool):

| Check | Result |
|---|---|
| Sign in with GitHub on the live URL | works (after adding the Cloud Run redirect URI to the GitHub App) |
| Create a project and an API key in the UI | works; the key is shown once, only its prefix is listed |
| Doc's multi-agent `curl` example (`docs/TRACING_API.md`) | `202 {"id":…,"evalsQueued":2,"costUsd":0.0108,"spans":5}`, exactly as documented; the trace page draws the span tree |
| Documented error bodies | 400 `{"error":"invalid json"}`, 401 `{"error":"invalid api key"}`, 422 with the documented `fieldErrors.spans` message: byte for byte |
| Evaluators run on the Cloud Run worker | 80 evaluator runs from the latency tests + 136 from the eval run: all `done`, 0 retries, 0 failures; worker pool logs show `eval.done` |
| Upload documents (`POST /api/v1/documents`) | 3 files → 55 chunks, all `ready` on attempt 1, 7.8 s after the first upload |
| Ask a RAG question in the UI | answered with a correct citation: 3,055 ms (retrieve 243, generate 2,811), $0.001139 |
| Run evaluation **button** (project-docs-v1, 34 questions, vector, k=5) | 34/34 answered, 136/136 evaluator runs settled, 0 errors; recall@5 1.000, MRR 0.941, all judges 1.00; p50 / p95 2,211 / 2,906 ms; $0.000941 per answer, $0.006704 per evaluated answer incl. 3 LLM judge calls; answers done in 94 s, all evaluations in 488 s (`datasets/rag/results/live-project-docs-v1-cmwkq9ong003y01s6jwziguon.json`) |

`POST /api/v1/traces` latency (`scripts/live-trace-bench.ts` + Cloud Run request logs):

| | p50 | p95 | notes |
|---|---|---|---|
| Server-side (Cloud Run request log, 31 requests) | **258 ms** | 595 ms | max 1,574 ms = first request on an instance (pg-boss start) |
| Client, this machine, 30 back-to-back | 547 ms | 806 ms | includes the network from here to us-central1 |
| Client, 10 requests 20 s apart | 947 ms | 1,161 ms | new connection each time |

The server-side figure is mostly database round trips from us-central1 to Neon in AWS
us-east-1 (auth lookup, then BEGIN, insert trace and spans, select evaluators, insert eval
runs, one pg-boss insert, COMMIT).

Trace sent → all evaluations settled (2 evaluators: assertion + LLM judge; DB timestamps):

| | p50 | p95 | max |
|---|---|---|---|
| 10 traces, 20 s apart (idle worker) | **6.5 s** | 12.2 s | 15.8 s |
| 30 traces back to back | 89 s | 170 s | 180 s; queueing behind one worker that runs one job at a time (judge calls 2.4–4.3 s, assertions 57 ms) |

Cold start of the web service (min instances 0):

| Build | First request on a new instance, server-side (Cloud Run log) | Client TTFB from this machine | container listening after |
|---|---|---|---|
| `next start` (revision 00001/00002) | 14.09 s | 14.85 s | 6.6 s ("Ready in 5.2s"), then 2.1 s to load `next.config.ts` on the first request |
| **standalone `server.js`** (revision 00003), 2 cold starts | **3.71 s and 1.94 s** | **2.51 s** (2nd cold start) | 2.5 s and 1.3 s, config loads in 18–20 ms |

The first API request on a fresh instance took 2.4–2.5 s client-side (2.17 s server-side:
pg-boss start and database connections), the next one 0.75–0.79 s (0.44 s server-side). One standalone client measurement was discarded: this
machine's network failed during it (9 s to connect, then curl errors, and gcloud's own API
call failed), while Cloud Run's log shows it served the request in 3.71 s.

Budget configuration in force:
- Web: min 0, max 3 instances; costs nothing while idle (request-based billing).
- Worker: worker pool, 1 instance, 1 vCPU (the minimum the API accepts) / 512 MiB: about
  **$30.75 per 30 days** at list price; **the only always-on cost**. An always-on service with
  the same size would be $49.25.
- Artifact Registry cleanup policy keeps the 3 newest images (~460 MB each).
- Not done: a billing budget alert (account setting, left to the owner).

### An incident during verification, and the fix

Near the end, a plain `npm test` loaded `.env`, whose `DATABASE_URL` is production, so the 8
pgvector integration tests ran against **production** once. They create an organization
`rag-test-<timestamp>` with two projects and delete it (cascade) when done. Checked right
after: no `rag-test-*` organization left; the 5,016 pre-existing traces and 15,030 eval runs,
3 organizations and 4 users unchanged; no queued, active or failed pg-boss jobs. Fix: the
integration suite now only runs with explicit `TEST_DATABASE_URL` / `TEST_DIRECT_URL` and
never reads `DATABASE_URL` / `DIRECT_URL` (no `dotenv` import). Verified: with production's
`.env` loaded, `npm test` → 48 pass, suite skipped; with `TEST_*` = the bench branch → 56 pass.

### Final state

- Web `eval-web` revision `eval-web-00003` (image `15942a0`, standalone server); worker pool
  `eval-worker` revision `eval-worker-00002` (image `d4bd368`; nothing the worker runs changed
  after it).
- Neon: production (migrated), the user's pre-migration backup branch, and the `bench`
  branch with the HotpotQA project (safe to delete once the reports are no longer needed).
- Railway: both services offline, worker auto-deploy off.
