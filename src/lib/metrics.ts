import { db } from "./db";

export type TimePoint = {
  bucket: string;
  traces: number;
  costUsd: number;
  promptTokens: number;
  completionTokens: number;
};

export type EvalSummary = {
  evaluator: string;
  type: string;
  total: number;
  passed: number;
  failed: number;
  errored: number;
  passRate: number | null;
  avgScore: number | null;
};

export type LatencyStats = {
  p50: number | null;
  p95: number | null;
  p99: number | null;
  maxMs: number | null;
};

export type RetryHealth = {
  totalRuns: number;
  firstTry: number;
  retried: number;
  deadLettered: number;
};

/** Daily trace volume + cost, with empty days filled in. */
export async function timeSeries(projectId: string, days = 14): Promise<TimePoint[]> {
  const rows = await db.$queryRaw<TimePoint[]>`
    with buckets as (
      select generate_series(
        date_trunc('day', now()) - make_interval(days => ${days - 1}),
        date_trunc('day', now()),
        interval '1 day'
      ) as bucket
    )
    select
      to_char(b.bucket, 'YYYY-MM-DD')                    as bucket,
      count(t.id)::int                                   as "traces",
      coalesce(sum(t."costUsd"), 0)::float8              as "costUsd",
      coalesce(sum(t."promptTokens"), 0)::int            as "promptTokens",
      coalesce(sum(t."completionTokens"), 0)::int        as "completionTokens"
    from buckets b
    left join "Trace" t
      on date_trunc('day', t."createdAt") = b.bucket
     and t."projectId" = ${projectId}
    group by b.bucket
    order by b.bucket asc
  `;
  return rows;
}

/** Per-evaluator pass rates. */
export async function evalSummary(projectId: string, days = 14): Promise<EvalSummary[]> {
  return db.$queryRaw<EvalSummary[]>`
    select
      e.name                                                          as "evaluator",
      e.type::text                                                    as "type",
      count(*)::int                                                   as "total",
      count(*) filter (where er.status = 'done' and er.passed)::int    as "passed",
      count(*) filter (where er.status = 'done' and not er.passed)::int as "failed",
      count(*) filter (where er.status = 'failed')::int                as "errored",
      case when count(*) filter (where er.status = 'done') = 0 then null
           else (count(*) filter (where er.status = 'done' and er.passed)::float8
                 / count(*) filter (where er.status = 'done')) end     as "passRate",
      avg(er.score)::float8                                            as "avgScore"
    from "EvalRun" er
    join "Evaluator" e on e.id = er."evaluatorId"
    join "Trace" t     on t.id = er."traceId"
    where t."projectId" = ${projectId}
      and er."createdAt" >= now() - make_interval(days => ${days})
    group by e.name, e.type
    order by e.name
  `;
}

/** Latency percentiles. */
export async function latencyStats(projectId: string, days = 14): Promise<LatencyStats> {
  const [row] = await db.$queryRaw<LatencyStats[]>`
    select
      percentile_cont(0.5)  within group (order by "latencyMs")::float8 as "p50",
      percentile_cont(0.95) within group (order by "latencyMs")::float8 as "p95",
      percentile_cont(0.99) within group (order by "latencyMs")::float8 as "p99",
      max("latencyMs")::int                                            as "maxMs"
    from "Trace"
    where "projectId" = ${projectId}
      and "latencyMs" is not null
      and "createdAt" >= now() - make_interval(days => ${days})
  `;
  return row ?? { p50: null, p95: null, p99: null, maxMs: null };
}

/** How well the retry machinery is doing — this is Day 4's work made visible. */
export async function retryHealth(projectId: string, days = 14): Promise<RetryHealth> {
  const [row] = await db.$queryRaw<RetryHealth[]>`
    select
      count(*)::int                                          as "totalRuns",
      count(*) filter (where er.attempts = 1)::int            as "firstTry",
      count(*) filter (where er.attempts > 1)::int            as "retried",
      count(*) filter (where er.error like '%dead-lettered%')::int as "deadLettered"
    from "EvalRun" er
    join "Trace" t on t.id = er."traceId"
    where t."projectId" = ${projectId}
      and er."createdAt" >= now() - make_interval(days => ${days})
  `;
  return row ?? { totalRuns: 0, firstTry: 0, retried: 0, deadLettered: 0 };
}