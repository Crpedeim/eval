# RAG pipeline — design notes

Retrieval-augmented generation on top of the evaluation platform: documents are ingested
into pgvector, questions are answered from the top-k retrieved chunks with citations, every
answer is recorded as a trace with one span per step, and a labelled question set measures
retrieval and answer quality.

## Ingestion

Uploads arrive at `POST /api/v1/documents` (API key) or through the upload form on the RAG
page (session auth). Accepted formats are markdown, plain text, CSV and PDF, up to 5 MB.
The document row and its `ingest-document` job are written in one transaction, the same
transactional-enqueue pattern traces use, so a document can never exist without its job.

The worker claims the document with a conditional update from `queued` or `running` to
`running`, then parses, chunks and embeds it. Writing chunks is delete-then-insert inside one
transaction, which makes a redelivered job idempotent: a rerun replaces the document's chunks
instead of duplicating them.

### Chunking

Chunking is character-based with a 1200 character window and a 150 character overlap.
Markdown is split at headings first, and every chunk is prefixed with its heading path, for
example "Guide > Setup > Env", so a short chunk still carries the context of its section.
Paragraphs are packed greedily; a paragraph longer than the window is split at sentence ends
and, as a last resort, at a hard character boundary. PDFs are chunked page by page so each
chunk records its page number. CSV files are structured data: each row becomes one chunk
rendered as `column: value` lines under the file name, so column names sit next to values.

### Embeddings

Embeddings come from gemini-embedding-001 truncated to 768 dimensions, which the model
supports because it was trained with Matryoshka representation learning. Documents are
embedded with the RETRIEVAL_DOCUMENT task type and questions with RETRIEVAL_QUERY, in batches
of 50 inputs per request. The Gemini embedding API does not report token usage, so embedding
tokens are estimated as characters divided by four and flagged as estimated.

## Retrieval and generation

Vectors live in a `vector(768)` column on the Chunk table with an HNSW index using
`vector_cosine_ops`. Retrieval orders chunks by cosine distance with the `<=>` operator and
always filters by project id, so a query can never return another tenant's chunks.

The generator uses the platform's judge model (gemini-3.8-flash in the measured run) with
temperature 0 and the lowest thinking setting the model accepts. The prompt
numbers the retrieved passages and instructs the model to cite them in square brackets and to
reply "I don't know based on the provided documents." when the passages lack the answer.
Citation markers are parsed back to chunk ids; numbers outside the retrieved range are dropped.

## Tracing

Each answer is stored as a trace named `rag.answer` with two spans: `retrieve` (query
embedding plus vector search, with the two timings recorded separately) and `generate`.
Spans record latency, prompt and completion tokens, and cost from the model price table.
Tokens per second is output tokens divided by generation wall-clock time; because generation
is not streamed, it includes time to first token. Cost per request is the sum of span costs.

## Evaluation

A dataset is a JSON file of questions, each labelled with one or more evidence spans copied
verbatim from the corpus. A retrieved chunk counts as relevant when it contains an evidence
span after normalisation (lowercase, markdown markers removed, whitespace collapsed). Labels
defined this way survive re-chunking, which chunk-id labels would not.

Recall@k is the fraction of a question's evidence spans found in the top k chunks; with a
single span per question it equals hit rate. MRR is the mean over questions of one divided by
the rank of the first relevant chunk, or zero when none is retrieved.

Answer quality uses the platform's existing LLM judge. Two `llm_judge` evaluators,
faithfulness and answer relevance, are scoped with `traceName = rag.answer`, so they run only
on RAG traces. Because each eval answer is an ordinary trace, the existing worker queues,
retries and settles the judge runs exactly as it does for customer traces.

Every question in a run is its own `rag-eval-item` job. The item's scores are written in the
same transaction as its trace, so a crash cannot leave a scored item without its trace.
