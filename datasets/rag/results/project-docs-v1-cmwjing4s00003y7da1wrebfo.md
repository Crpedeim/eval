# RAG eval — project-docs-v1 (run cmwjing4s00003y7da1wrebfo)

- Date: 2026-11-16T17:07:09.292Z
- Models: generator `gemini-3.8-flash`, embedder `gemini-embedding-001`, judge `gemini-3.8-flash`
- k = 5; questions: 34 (34 answered, 0 failed)
- Wall clock from enqueue to all items + judges settled: 481s

| Metric | Value |
|---|---|
| Recall@5 | 1.000 |
| Hit rate@5 | 1.000 |
| MRR@5 | 0.941 |
| helpfulness-judge (mean score / pass rate @0.7) | 1.000 / 1.000 (34 judged, 0 errored) |
| output-not-empty (mean score / pass rate @0.7) | 1.000 / 1.000 (34 judged, 0 errored) |
| rag-answer-relevance (mean score / pass rate @0.7) | 1.000 / 1.000 (34 judged, 0 errored) |
| rag-faithfulness (mean score / pass rate @0.7) | 1.000 / 1.000 (34 judged, 0 errored) |
| Answers with ≥1 citation | 1.000 |
| Citation precision (cited chunk is labelled relevant) | 0.875 |
| "I don't know" answers | 0 |
| Request latency p50 / p95 | 2045 / 3442 ms |
| retrieve span p50 / p95 | 259 / 369 ms |
| generate span p50 / p95 | 1780 / 3070 ms |
| Generate prompt / output tokens (mean) | 1030 / 42.0 |
| Generate tokens/sec (median / mean / aggregate) | 21.0 / 22.9 / 16.3 |
| Cost per request (retrieve + generate, mean) | $0.000932 |
| Total cost of answered requests | $0.031704 |

## Per question

| id | recall | RR | helpfulness-judge | output-not-empty | rag-answer-relevance | rag-faithfulness | latency | answer |
|---|---|---|---|---|---|---|---|---|
| c01 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1562 ms | The source file `src/lib/errors.ts` classifies thrown errors as transient or permanent [1]. |
| c02 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2024 ms | The Prisma client uses a pool of 5 connections [1]. It has a transaction `maxWait` of 20 seconds and a timeout of 30 seconds [1]. |
| c03 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2026 ms | A generated API key is formatted as `evp_live_` followed by 24 random bytes in base64url [1]. |
| c04 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1651 ms | The Recharts chart components are contained in `src/components/charts.tsx` [1]. |
| c05 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2844 ms | The route file that serves session-authenticated project metrics JSON is `src/app/projects/[projectId]/metrics/route.ts` [1]. |
| c06 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2137 ms | The RFC 4180 CSV parser is contained in `src/lib/rag/chunking.ts` [1]. |
| c07 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2024 ms | Upstream model errors map to a 503 HTTP status code when transient and to a 502 status code otherwise [1]. |
| c08 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2364 ms | API key authentication updates `lastUsedAt` without awaiting the operation [1]. |
| p01 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1795 ms | The RAG pipeline uses a character-based chunking method with a 1200 character window and a 150 character overlap [1]. |
| p02 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2283 ms | The embeddings can be truncated to 768 dimensions because the `gemini-embedding-001` model was trained with Matryoshka representation learning [1]. |
| p03 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1707 ms | Documents are embedded with the `RETRIEVAL_DOCUMENT` task type, while questions are embedded with the `RETRIEVAL_QUERY` task type [1]. |
| p04 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 26747 ms | Vector similarity search is served by an HNSW index using `vector_cosine_ops` on a `vector(768)` column [2]. |
| p05 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2411 ms | A retrieved chunk counts as relevant when it contains an evidence span after normalisation [1]. Normalisation includes converting to lowercase, removing markdow |
| p06 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2064 ms | The tokens per second figure includes time to first token because generation is not streamed [1]. As a result, it is calculated as output tokens divided by the  |
| p07 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2046 ms | The faithfulness and answer relevance evaluators are scoped with `traceName = rag.answer`, which ensures they run only on RAG traces [1]. |
| p08 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2110 ms | When the retrieved passages lack the answer, the model is instructed to reply: "I don't know based on the provided documents." [1] |
| r01 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2387 ms | The platform is split into a web service that answers HTTP requests and a worker service that is a long-lived process polling a queue with no HTTP surface [1].  |
| r02 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1908 ms | A forced failure mid-transaction leaves zero rows in `Trace`, zero rows in `EvalRun`, and zero rows in `pgboss.job` [1]. |
| r03 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2212 ms | An `EvalRun` in the `running` state is deliberately claimable so that if a worker dies mid-job, the row does not remain stranded [1]. Excluding the `running` st |
| r04 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1942 ms | When duplicate jobs are sent for an already settled `EvalRun`, the conditional update matches zero rows because terminal statuses (`done` and `failed`) are excl |
| r05 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 1929 ms | Unknown errors default to being classified as permanent [1][2]. This choice was made because the costs are asymmetric: wrongly retrying creates a storm against  |
| r06 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2060 ms | Retries use exponential backoff with equal jitter to prevent simultaneous failures from synchronizing [1]. The delay settings use a `retryDelay` of 2 seconds an |
| r07 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2316 ms | The worker uses `batchSize: 1` for failure isolation because pg-boss treats a batch as a single unit of work [1]. If one job in a batch fails, all jobs in that  |
| r08 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2293 ms | API keys are stored as SHA-256 hashes accompanied by a short, non-secret prefix used for lookup [1][2]. A fast hash is acceptable instead of bcrypt because the  |
| r09 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1823 ms | A cross-tenant request receives a 404 status code instead of a 403 [1][2]. It does not return a 403 because a 403 confirms that the resource exists, which is it |
| r10 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 4552 ms | The judge prompt puts reasoning before the score following the G-Eval finding that models score better after reasoning than when emitting a number cold [1]. |
| r11 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2127 ms | The judge rubric mitigates verbosity bias by explicitly instructing the judge to ignore output length [1]. This serves as a direct mitigation for the bias docum |
| r12 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1916 ms | The actual cause was roughly 300ms of round-trip latency between the developer's location and the database region, multiplied across approximately 20 sequential |
| r13 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 1935 ms | When connection exhaustion was suspected, `pg_stat_activity` showed 8 total connections against a much higher limit [2]. |
| r14 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2474 ms | The separate pooled and direct database URLs are required because connection poolers do not support the prepared statements that Prisma's migration engine and p |
| r15 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1795 ms | On success, `POST /api/v1/traces` returns **202 Accepted** [1][2]. |
| r16 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 2044 ms | Sessions are JWT-based because Prisma cannot run in Next.js's edge runtime, which would be required for a database-backed session strategy [1]. The downside of  |
| r17 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1745 ms | The first item on the list of things the author would add next is a "Judge calibration harness" [1]. It involves using human labels on a sample, measuring Cohen |
| r18 | 1.00 | 0.50 | 1.00 | 1.00 | 1.00 | 1.00 | 1862 ms | The deterministic assertion evaluator supports the rules `non_empty`, `json_valid`, `contains`, `regex`, and `max_length` [1][2]. Each of these checks returns a |
