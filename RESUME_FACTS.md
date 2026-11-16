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
- Judge: Gemini `gemini-2.5-flash` by default (`JUDGE_MODEL`), temperature 0, JSON output
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
- **Generation:** `gemini-2.5-flash`, temperature 0, thinking budget 0, numbered passages,
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
- **37 tests in 12 suites, 37 passing, ~1.2 s.** 16 chunking tests, 15 metric tests, and
  6 retrieval/pipeline integration tests against a real PostgreSQL 16.15 + pgvector 0.6.0.
  The integration tests use a deterministic feature-hashing embedder, so they need no API
  key. They cover ingestion chunk counts, idempotent re-ingestion, ranking order, CSV row
  retrieval, k-limit and cross-project isolation, and trace + span + scoped-evaluator
  recording.
- First test run found one real bug (generation latency was rounded to whole ms before
  computing tokens/sec, which gave `null` for sub-millisecond calls). Fixed, then all 37 passed.
- `next build` succeeds: 16 routes. `eslint`: 0 errors.

### Eval corpus and label check **[ran: `npm run rag:check`]**
| File | Kind | Bytes | Extracted chars | Chunks |
|---|---|---|---|---|
| README.md (snapshot) | markdown | 16,525 | 16,425 | 25 |
| rag-design.pdf (docs/RAG.md printed to PDF, 2 pages) | pdf | 23,628 | 4,358 | 4 |
| source-inventory.csv (26 rows) | csv | 4,949 | 4,949 | 26 |
| **Total** | | **45,102** | **25,732** | **55** |

- 34 labelled questions (18 README, 8 CSV, 8 PDF), 34 evidence spans; **0 spans fail to
  land in some chunk** of their expected source file.

### Code size **[ran: line count of .ts/.tsx/.prisma/.sql under src, scripts, prisma]**
- 1,989 lines before this work → 4,839 lines after (generated Prisma client excluded).

### RAG eval results, latency, tokens/sec, cost per request
- **Not yet measured.** The run needs a Gemini API key, and none was configured in the
  sandbox; the first live call returned `400 API_KEY_INVALID`. This section will be filled
  with numbers from `npm run rag:eval` once the key is available. Nothing here is estimated.

---

## 5. Limitations

**Of the measurement setup**
- Measurements ran against a local PostgreSQL 16.15 with pgvector 0.6.0 (Ubuntu package),
  not the production Neon database: the sandbox had no Neon credentials and no network
  route to it. The migration is Neon-compatible (`CREATE EXTENSION vector`), but Neon latency
  was not measured.
- The question set is small (34) and was written by the same agent that built the pipeline,
  over the project's own docs. Recall@k uses one evidence span per question, so it equals
  hit rate.

**Of the RAG feature**
- Embedding token counts and costs are estimates (chars / 4): Gemini's embedding API
  returns no usage. Generation tokens come from Gemini's `usageMetadata`.
- Judge calls are not costed: `JudgeProvider` returns only parsed JSON, not usage.
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
