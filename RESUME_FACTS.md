# RESUME_FACTS

Only facts verified from the code in this repository or from commands run on 2026-11-16.
Each item says where it comes from: **[code]** = read in the source, **[ran]** = measured by
a command, **[README]** = stated in README.md but not re-verified by me.

---

## 1. What the platform does (plain words)

A multi-tenant web service for logging and grading LLM calls. A customer's app sends each
LLM call (input, output, model, token counts, latency) to an HTTP API with a project API key.
The platform stores it as a *trace*, works out its cost from a price table, and queues one
background job per configured *evaluator*. A separate worker process runs those jobs: cheap
deterministic checks (non-empty, max length, regex, contains, valid JSON) and an LLM judge
that scores the output against a rubric. A dashboard shows volume, spend, tokens, latency
percentiles, pass rates per evaluator and retry health per project. **[code]**

The RAG feature added in this branch lets a project upload documents (markdown, text, PDF,
CSV), turns them into searchable vector chunks in Postgres, answers questions from the
top-k chunks with numbered citations, records every answer as a trace with `retrieve` and
`generate` steps, and scores the pipeline on a labelled question set. **[code]**

---

## 2. Tech stack and architecture

### Stack **[code: package.json]**
- TypeScript, Next.js 16.3.2 (App Router), React 19.2.8
- PostgreSQL via Prisma 7.9 (`prisma-client` generator, `@prisma/adapter-pg` driver adapter)
- pg-boss 12 job queue, stored in the same Postgres (`pgboss` schema)
- Auth.js / next-auth v5 beta, GitHub OAuth, JWT sessions, Prisma adapter
- Google Gemini via `@google/genai` (judge, and for RAG: generation and embeddings)
- zod 4 for request and config validation; Recharts 3 for charts; Tailwind CSS 4
- pgvector for vector search (added for RAG); `unpdf` for PDF text extraction (added)
- Tests: Node's built-in `node:test` run through `tsx` (added; there was no test setup before)

### Services **[code]**
- **Web** (`next start`): two API planes.
  - Ingestion plane (`/api/v1/*`), Bearer API key: `POST /api/v1/traces` and, new,
    `POST /api/v1/documents`, `GET /api/v1/documents/:id`, `POST /api/v1/rag/query`.
  - Application plane (pages, `/projects/:id/metrics`): GitHub session; every query goes
    through a `TenantScope` class that filters by the user's organizations.
- **Worker** (`npm run worker` → `tsx src/worker/index.ts`): long-lived, no HTTP surface.
  Consumes 6 queues: `eval-run`, `ingest-document`, `rag-eval-item` and a dead-letter queue
  for each. Every consumer uses `batchSize: 1`; the main queues poll every 2 s.

### Database **[code: prisma/schema.prisma, migrations]**
- Original models: User, Account, Session, VerificationToken, Organization, Membership
  (roles owner/admin/member), Project, ApiKey, Trace, Evaluator, EvalRun.
  `EvalRun` has a unique `(traceId, evaluatorId)` constraint.
- Added: `Span` (steps inside a trace), `Document`, `Chunk` (`embedding vector(768)` with an
  HNSW `vector_cosine_ops` index), `RagEvalRun`, `RagEvalItem`, and a nullable
  `Evaluator.traceName` so an evaluator can be limited to traces with one name.
- 4 migrations (3 existing + 1 added for RAG, which runs `CREATE EXTENSION IF NOT EXISTS vector`).
- Prisma client: connection pool max 5, interactive transaction `maxWait` 20 s,
  `timeout` 30 s (`src/lib/db.ts`). pg-boss uses the direct (non-pooled) URL with max 3
  connections (`src/lib/queue.ts`).

### Job pipeline **[code]**
- **Transactional enqueue.** The trace row, its `EvalRun` rows and the pg-boss job rows are
  written in one Prisma transaction by passing `fromPrisma(tx)` to `boss.send`
  (`src/lib/enqueue-evals.ts`). The new document upload and RAG eval run use the same
  pattern. README states a forced mid-transaction failure left zero rows in all three
  tables **[README]**. The route has a `?fail=1` switch, outside production only, that
  simulates this **[code]**.
- **Retry policy** for eval jobs: `retryLimit 3`, `retryDelay 2 s`, exponential backoff
  capped at 60 s, `expireInSeconds 120`, dead-letter queue. Ingestion: retryLimit 5,
  expire 600 s. RAG eval items: retryLimit 6, delay 5 s, cap 120 s, expire 300 s. **[code]**
- **Idempotent claim.** The worker claims a row with
  `updateManyAndReturn(where status in [queued, running])`. A redelivered job for a
  settled row matches nothing and is logged as `skip`. **[code]** Observed in the worker log
  during my run: leftover jobs whose rows had been deleted logged
  `eval.skipped … already_settled` and did nothing. **[ran]**
- **Error classification** (`src/lib/errors.ts`): 429, 5xx, Gemini `RESOURCE_EXHAUSTED` /
  `UNAVAILABLE` messages, and network codes (`ECONNRESET`, `ETIMEDOUT`, `ECONNREFUSED`,
  `EAI_AGAIN`) are transient and rethrown so pg-boss retries. Everything else, including
  unknown errors, is permanent and settled as `failed` at once. **[code]** Observed: an
  ingestion job that hit Gemini's `400 API_KEY_INVALID` was settled `failed` after exactly
  1 attempt (107 ms), with no retries. **[ran]**

### Evaluators **[code]**
- Registry of `{ type, configSchema (zod), run }`. Types: `assertion` (`non_empty`,
  `json_valid`, `contains`, `regex`, `max_length`, score 1/0) and `llm_judge` (rubric +
  threshold, default 0.7).
- Judge: Gemini, model from `JUDGE_MODEL` (code default `gemini-2.5-flash`; the measured run
  used `gemini-3.8-flash` because Google returned "`gemini-2.5-flash` is no longer available
  to new users" for this key **[ran]**), temperature 0, JSON output
  forced with `responseSchema` with `reasoning` before `score`, response validated with zod.
  The provider sits behind a 3-member `JudgeProvider` interface selected by `JUDGE_PROVIDER`.

### Security / tenancy **[code]**
- API keys: `evp_live_` + 24 random bytes (base64url); only a SHA-256 hash is stored, plus a
  13-character non-secret prefix. `lastUsedAt` is updated fire-and-forget.
- Cross-tenant access to projects, traces, metrics, documents and eval runs returns 404,
  never 403. Organization ids come from the session, never from request parameters.
- Cost is always computed server-side from tokens and the price table; a client-supplied
  cost is never accepted (this also applies to the new optional `spans` on `/api/v1/traces`).

### Dashboard **[code]**
- Overview: traces, cost, latency p95/p50, retry rate; charts for volume, cost, stacked
  prompt/completion tokens, pass rate per evaluator; ranges 7/14/30/90 days (max 90).
  Aggregations are raw SQL (`generate_series` to fill empty days, `percentile_cont`).
- Traces list: 25 per page (max 100), filter by model and "has failing eval".
- New RAG page: documents and ingestion status, upload form, ask form, per-step p50/p95
  latency, average tokens in/out, median tokens/sec and average cost, plus eval runs.
  New eval-run page shows metrics for each question. Trace detail now shows a span
  waterfall and citations.

### Deployment
- README states it runs on Railway as two services (web + worker) with Neon Postgres, at
  `https://eval-production-fd70.up.railway.app`. **[README]** I could not reach that URL
  from my sandbox, and the repo has no Railway config file, so this is not verified by me.

---

## 3. RAG feature: what was built **[code]**

- **Ingestion:** the upload (API or UI form, max 5 MB) stores the document and enqueues an
  `ingest-document` job in one transaction. The worker parses, chunks, embeds, then deletes
  and re-inserts the document's chunks in one transaction, so a retried job is idempotent
  (covered by a test).
- **Chunking:** 1200-character window with 150-character overlap. Markdown is split at
  headings (ignoring `#` inside code fences) and each chunk is prefixed with its heading
  path. Long paragraphs are split at sentences, then by hard cuts. PDFs are chunked per page,
  with the page number stored. CSV is parsed by a hand-written RFC 4180 parser into one chunk
  per row, as `column: value` lines.
- **Embeddings:** `gemini-embedding-001` truncated to 768 dimensions, with task types
  `RETRIEVAL_DOCUMENT` and `RETRIEVAL_QUERY`, in batches of 50.
- **Retrieval:** pgvector cosine distance (`<=>`) over the HNSW index, always filtered by
  project id.
- **Generation:** the judge's model unless `RAG_MODEL` is set (measured: `gemini-3.8-flash`),
  temperature 0. Thinking is kept minimal: `thinkingBudget: 0` on Gemini 2.x, and
  `thinkingLevel: LOW` on Gemini 3. Gemini 3 silently ignored `thinkingBudget: 0` (a test call
  still used 166 thinking tokens) and rejects `MINIMAL` **[ran]**. Numbered passages;
  told to cite `[n]` or say "I don't know based on the provided documents." Citations are
  parsed back to chunk ids; out-of-range numbers are dropped.
- **Tracing:** each answer is a `rag.answer` trace with a `retrieve` span (query-embedding
  ms and vector-search ms recorded separately) and a `generate` span (prompt tokens, output
  tokens incl. thinking tokens, tokens/sec, cost). Cost per request = sum of span costs.
- **Evaluation:** questions are labelled with verbatim evidence spans; recall@k, hit rate,
  MRR, citation rate and citation precision are computed per item. Faithfulness and answer
  relevance are two ordinary `llm_judge` evaluators with `traceName = "rag.answer"`, so the
  existing worker queues and settles them. Each question is its own job; its scores are
  written in the same transaction as its trace.

---

## 4. Measured numbers

### Tests **[ran: `npm test`]**
- **40 tests in 12 suites, 40 passing, ~1.2 s.** 16 chunking tests, 15 metric tests,
  3 error-classification tests, and 6 retrieval/pipeline integration tests against a real PostgreSQL 16.15 + pgvector 0.6.0.
  The integration tests use a deterministic feature-hashing embedder, so they need no API
  key. They cover ingestion chunk counts, idempotent re-ingestion, ranking order, CSV row
  retrieval, k-limit and cross-project isolation, and trace + span + scoped-evaluator
  recording.
- First test run found one real bug (generation latency was rounded to whole ms before
  computing tokens/sec, which gave `null` for sub-millisecond calls). Fixed, then all 37 passed.
- A live call found a second real bug: Gemini reports billing exhaustion as
  `402 … RESOURCE_EXHAUSTED`. The existing classifier matched `RESOURCE_EXHAUSTED` as a rate
  limit and would have retried it. It is now classified permanent before the rate-limit check,
  and 3 tests were added (402 → permanent, 429 → still transient, invalid key → permanent).
- `next build` succeeds: 16 routes. `eslint` on all new/changed files: 0 problems (4 errors
  + 1 warning remain in pre-existing, untouched files: `scripts/check-models.ts`, `src/worker/index.ts`).

### Eval corpus and label check **[ran: `npm run rag:check`]**
| File | Kind | Bytes | Extracted chars | Chunks |
|---|---|---|---|---|
| README.md (snapshot) | markdown | 16,525 | 16,425 | 25 |
| rag-design.pdf (docs/RAG.md printed to PDF, 2 pages) | pdf | 23,861 | 4,432 | 4 |
| source-inventory.csv (26 rows) | csv | 4,949 | 4,949 | 26 |
| **Total** | | **45,335** | **25,806** | **55** |

- 34 labelled questions (18 README, 8 CSV, 8 PDF), 34 evidence spans; **0 spans fail to
  land in some chunk** of their expected source file.

### Code size **[ran: line count of .ts/.tsx/.prisma/.sql under src, scripts, prisma]**
- 1,989 lines before this work → 4,980 lines after (generated Prisma client excluded).

### Ingestion (real run) **[ran: `npm run rag:ingest`, through `POST /api/v1/documents` → worker]**
| File | Status | Chunks | Parse ms | Embed ms | Write ms | Attempts |
|---|---|---|---|---|---|---|
| README.md | ready | 25 | 1 | 778 | 81 | 1 |
| source-inventory.csv | ready | 26 | 1 | 451 | 40 | 1 |
| rag-design.pdf | ready | 4 | 133 | 295 | 12 | 1 |

- 3 documents → **55 chunks / 768-d vectors** in pgvector; all settled **5.2 s** after the first
  upload. Estimated embedding input: 7,361 tokens (chars/4).

### RAG eval (real run) **[ran: `npm run rag:eval`, run `cmwjing4s00003y7da1wrebfo`, 2026-11-16]**
Setup: 34 questions, k = 5, generator and judge `gemini-3.8-flash` (thinking level LOW for
generation), embedder `gemini-embedding-001` (768-d), local PostgreSQL 16.15 + pgvector 0.6.0.
Full report: `datasets/rag/results/project-docs-v1-cmwjing4s00003y7da1wrebfo.{md,json}`.

| Metric | Value | How it was measured |
|---|---|---|
| Answered | 34 / 34, 0 failed, 0 retries | `RagEvalItem.status`, `attempts` |
| **Recall@5** | **1.000** (34/34) | evidence span found in top-5 chunks |
| **MRR@5** | **0.941** | mean 1/rank of first relevant chunk; 30 questions rank 1, 4 rank 2 (p04, r05, r13, r18) (README 0.917, PDF 0.938, CSV 1.000) |
| **Faithfulness (LLM judge)** | **1.00 mean, 34/34 pass** @0.7 | existing `llm_judge` evaluator, scoped to `rag.answer` |
| **Answer relevance (LLM judge)** | **1.00 mean, 34/34 pass** @0.7 | same |
| Answers with ≥1 citation | 34 / 34 | parsed `[n]` markers |
| Citation precision | 0.875 | share of cited chunks that contain the labelled evidence |
| "I don't know" refusals | 0 | whole answer equals the refusal sentence |
| **Request latency** | **p50 2,045 ms, p95 3,442 ms** (mean 2,856) | `Trace.latencyMs`, wall clock retrieve→generate |
| retrieve step | p50 259 ms, p95 369 ms | query embedding (Gemini API) + pgvector search |
| generate step | p50 1,780 ms, p95 3,070 ms (mean 2,577) | Gemini `generateContent`, non-streaming |
| Tokens per request | 1,030 prompt / 42 output (means) | Gemini `usageMetadata` |
| **Tokens/sec (generate)** | **median 21.0**, mean 22.9, aggregate 16.3 | output tokens ÷ generate wall-clock s |
| **Cost per request** | **$0.000932** mean; $0.0317 for all 34 | sum of span costs: $0.75/$3.75 per 1M (gemini-3.8-flash), $0.15/1M embedding |
| Eval throughput | answers all settled in 101 s; all 136 evaluator runs settled 480 s after start | DB timestamps |

- 136 evaluator runs = 34 traces × 4 evaluators: the 2 RAG judges, plus the project's 2
  pre-existing unscoped evaluators (`output-not-empty`, `helpfulness-judge`), which also run on
  every trace and scored 1.00 too. The judge queue (single worker, `batchSize: 1`) was the
  bottleneck: 101 s for answers vs 480 s until every judge run settled.
- Single ad-hoc query via `POST /api/v1/rag/query` ("Why does the worker use batchSize 1?"):
  correct answer citing README chunk 8, 2,660 ms total (retrieve 619 ms, generate 2,041 ms,
  38.7 tok/s), $0.00108. **[ran]**

### Judge negative control **[ran: `scripts/rag-judge-control.ts`, 80 judge calls]**
All judges scoring 1.00 could mean a judge that never says no, so the same two RAG judges
(same configs) re-scored 10 of the real eval items (c01, c04, c07, p02, p05, p08, r03, r06,
r09, r12) with deliberately bad outputs:

| Output variant | Faithfulness | Relevance |
|---|---|---|
| original answer | 1.00 | 1.00 |
| swapped (another question's answer) | 0.10 | 0.00 |
| fabricated (real answer + one invented claim) | 0.52 | 0.50 |
| refusal ("I don't know…") despite answerable context | 0.10 | 0.00 |

The judges do discriminate. The 1.00 scores reflect an easy dataset, not a judge that
always passes. Raw rows: `datasets/rag/results/judge-negative-control-cmwjing4s00003y7da1wrebfo.json`.

### UI **[ran: production build + Playwright screenshots, signed in via a locally minted session]**
- `docs/rag-rag.png`: RAG page (3 documents / 55 chunks, 35 requests, $0.000937/request,
  p95 3,356 ms, 21.0 tok/s, per-step table, eval-run row, documents table).
- `docs/rag-eval.png`: eval-run page with metric tiles and per-question scores.
- `docs/rag-trace.png`: trace detail with span waterfall, citations, retrieved passages and
  the 4 judge verdicts with reasoning.
- (The RAG page counts 35 requests: the 34 eval answers plus the single API query.)

---

## 5. Limitations

**Of the measurement setup**
- Measurements ran against a local PostgreSQL 16.15 with pgvector 0.6.0 (Ubuntu package),
  not the production Neon database: the sandbox had no Neon credentials and no network
  route to it. The migration is Neon-compatible (`CREATE EXTENSION vector`), but Neon latency
  was not measured.
- **The dataset is easy and small, so the scores are near the ceiling.** 34 questions over
  a 55-chunk corpus, written by the same agent that built the pipeline, with evidence phrased
  close to the question. Recall@5 = 1.0 and judge = 1.0 say the pipeline works end to end. They
  do not show how it does on a hard or large corpus. Recall@k uses one evidence span per
  question, so it equals hit rate.
- The generator and the judge are the same model (`gemini-3.8-flash`), so self-preference bias
  is possible. The negative control shows the judges reject bad answers, but it does not rule
  that bias out. Relevance also dropped (0.5) for fabricated answers, though its rubric says to
  ignore accuracy, so the two judges are not fully independent.
- One run only: no repeated runs, so no variance or confidence intervals. Latency includes
  network round-trips from this sandbox to Google's API.
- The `gemini-3.8-flash` price ($0.75 / $3.75 per 1M) comes from third-party pricing pages,
  not confirmed on Google's own page; one source says it rises after 2026-12-31.
- In this sandbox, Node's built-in `fetch` (used by the Gemini SDK) only went through the
  HTTPS proxy with `NODE_USE_ENV_PROXY=1`. That is an environment setting, not a code change.

**Of the RAG feature**
- Embedding token counts and costs are estimates (chars / 4): Gemini's embedding API
  returns no usage. Generation tokens come from Gemini's `usageMetadata`.
- Judge calls are not costed: `JudgeProvider` returns only parsed JSON, not usage. Cost per
  request above therefore excludes the 2–4 judge calls made per eval answer.
- Tokens/sec is non-streaming end-to-end throughput (includes time to first token).
- Chunking is character-based, not token-based. An evidence span that straddles a chunk
  boundary can be missed even when retrieval is good.
- The HNSW index is filtered by project after the approximate search; with many projects in
  one table, a query could return fewer than k results (not tested at scale).
- RAG eval runs start from a CLI script; there is no "run eval" button.
- Vector dimension (768) is fixed in the schema; changing embedding models needs a migration
  and re-ingestion.

**Of the existing platform** **[code / README]**
- Evaluators are configured by seed scripts; there is no management UI.
- Tenant isolation is application-layer (no Row-Level Security). Roles exist but are not enforced.
- JWT sessions: no instant revocation.
- No caching or rollups for aggregation queries.
- Only the RAG `Span` table gives nested steps; other traces stay flat unless the
  client sends the new optional `spans` array.
- The price table originally covered only `claude-sonnet-4-6` and `gpt-4o`; Gemini rates
  were added in this work. Unknown models cost $0.
- Leftover scaffolding: the home page `/` is the create-next-app template, the layout title
  is "Create Next App", and the trace detail page exists twice (`/traces/:id` and
  `/projects/:id/traces/:id`).
- README says the dashboard screenshots use ~5,000 synthetic traces. **[README]**
