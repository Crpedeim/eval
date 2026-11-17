import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Trace every LLM call",
    body: "POST input, output, model, tokens and latency to /api/v1/traces with a project API key. Optional spans record multi-step and multi-agent runs. Cost is computed server-side from a price table.",
  },
  {
    title: "Evaluate automatically",
    body: "Each trace queues one job per evaluator in the same database transaction. A worker runs deterministic assertions and LLM-as-judge rubrics, with retries, idempotent claims and a dead-letter queue.",
  },
  {
    title: "Retrieval-augmented answers",
    body: "Upload markdown, text, CSV or PDF. The worker chunks and embeds it into pgvector; questions are answered from retrieved passages with numbered citations, and every answer is a traced, judged request.",
  },
  {
    title: "Measure retrieval quality",
    body: "Run a labelled question set from the RAG page: recall@k, MRR, citation precision, faithfulness and relevance judges, per-step latency, tokens/sec and cost per answer including judge calls.",
  },
];

const shots = [
  { src: "/screenshots/dashboard.png", w: 2552, h: 1256, alt: "Project overview: trace volume, cost, tokens, latency percentiles and evaluator pass rates" },
  { src: "/screenshots/rag-trace.png", w: 2000, h: 900, alt: "A RAG answer trace with a retrieve and generate span waterfall and citations" },
  { src: "/screenshots/rag-eval.png", w: 2800, h: 1800, alt: "A RAG evaluation run with recall@k, MRR, judge scores, latency and cost" },
  { src: "/screenshots/trace-evals.png", w: 2455, h: 1061, alt: "Trace detail with assertion and LLM-judge verdicts and reasoning" },
];

export default function Home() {
  return (
    <div className="min-h-full bg-white text-gray-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <span className="font-semibold">Eval Platform</span>
        <nav className="flex items-center gap-4 text-sm">
          <a href="https://github.com/Crpedeim/eval" className="text-gray-600 hover:text-gray-900">GitHub</a>
          <Link href="/login" className="rounded bg-black px-4 py-2 text-white hover:bg-gray-800">Sign in</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-8">
        <section className="py-14 sm:py-20">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Log, grade and debug your LLM calls.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-600">
            A multi-tenant evaluation and observability platform. Send traces from your app,
            score them with assertions and LLM judges in the background, and see cost, latency
            and quality per project, including a built-in RAG pipeline you can evaluate end to end.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="rounded bg-black px-5 py-3 text-white hover:bg-gray-800">
              Sign in with GitHub
            </Link>
            <a
              href="https://github.com/Crpedeim/eval/blob/main/docs/TRACING_API.md"
              className="rounded border border-gray-300 px-5 py-3 hover:bg-gray-50"
            >
              Tracing API
            </a>
          </div>
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="rounded-lg border border-gray-200 p-5">
              <h2 className="font-medium">{f.title}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 space-y-10">
          <h2 className="text-2xl font-semibold">Screenshots</h2>
          {shots.map((s) => (
            <figure key={s.src}>
              <Image
                src={s.src}
                width={s.w}
                height={s.h}
                alt={s.alt}
                sizes="(max-width: 1152px) 100vw, 1152px"
                className="h-auto w-full rounded-lg border border-gray-200"
              />
              <figcaption className="mt-2 text-sm text-gray-500">{s.alt}</figcaption>
            </figure>
          ))}
        </section>
      </main>
    </div>
  );
}
