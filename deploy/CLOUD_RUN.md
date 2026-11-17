# Deploying to Google Cloud Run

Production runs on Google Cloud Run in `us-central1`, on the same Neon Postgres database
the Railway deployment used. Everything below is done by `deploy/deploy_cloud_run.sh`.

| Piece | Cloud Run resource | Settings |
|---|---|---|
| Web (Next.js, UI + `/api/v1/*`) | service `eval-web` | min 0, max 3 instances, 1 vCPU, 1 GiB, concurrency 40, startup CPU boost, public |
| Worker (pg-boss consumer, no HTTP) | **worker pool** `eval-worker` | exactly 1 instance (manual scaling), 1 vCPU, 512 MiB |
| Migrations | job `eval-migrate` | `prisma migrate deploy`, run on each deploy, then exits |
| Image | Artifact Registry `eval/eval-platform:<git sha>` | one image, `ROLE=web|worker|migrate`; cleanup policy keeps the 3 newest |
| Secrets | Secret Manager | `eval-database-url`, `eval-direct-url`, `eval-auth-secret`, `eval-auth-github-id`, `eval-auth-github-secret`; Gemini key from the existing `gemini-api-key` |

Live URL: **https://eval-web-827630707333.us-central1.run.app**

## Why a worker pool for the worker

The worker has no HTTP surface: it polls the pg-boss tables and must keep running whether
or not anyone is using the site. A Cloud Run *service* scales on requests and throttles CPU
outside them, so as a service the worker would need a fake health endpoint, `min-instances=1`
and "CPU always allocated", which is billed at the always-on service rate. Cloud Run **worker
pools** exist for exactly this (background pull-based work, no endpoint, no request scaling),
are available in this project (`gcloud run worker-pools`, GA), and are billed per
instance-second at a lower rate. The script falls back to the service form
(`WORKER_AS_SERVICE=yes`) if worker pools are not available; the worker already serves a
bare health check on `$PORT` for that case.

Monthly cost of the worker, computed from Google's list prices for `us-central1` on
https://cloud.google.com/run/pricing (read 2026-11-17), for 30 days = 2,592,000 s:

| Configuration | CPU | Memory | 30 days at list price |
|---|---|---|---|
| Worker pool, 1 vCPU, 512 MiB | 2,592,000 × $0.000011244 = $29.14 | 1,296,000 GiB-s × $0.000001235 = $1.60 | **$30.75** |
| Worker pool, 0.5 vCPU, 512 MiB | $14.57 | $1.60 | $16.17, **not allowed**: the API rejects it ("Total cpu < 1 is not supported ... with cpu always allocated") |
| Fallback: service, min 1, CPU always allocated, 1 vCPU, 512 MiB | 2,592,000 × $0.000018 = $46.66 | 1,296,000 × $0.000002 = $2.59 | $49.25 |

Cloud Run's monthly free tier for worker pools (384,204 vCPU-s and 728,744 GiB-s) would take
about $5.22 off either worker-pool line, but it is per billing account and this project also
runs TriageAI, so whether any of it is left is not knowable from here. These are computed
from list prices, not measured bills; check Billing → Reports after a few days.

## What costs money while idle

- **The worker: always.** One instance runs 24/7 (see the table). This is the only
  always-on compute.
- Web: nothing while idle (min 0 instances, request-based billing). The first request after
  it scales to zero pays a cold start (measured below).
- Neon: billed by Neon, unchanged by this move. Note that the worker keeps a connection open
  and polls every 2 s, so on Neon plans with scale-to-zero the compute never suspends.
- Artifact Registry: images are ~460 MB each; storage above 0.5 GB is billed. The cleanup
  policy keeps the 3 newest.
- Secret Manager: 5 secrets plus access operations, cents per month.
- Cloud Build: only while building.

## Prerequisites

- `gcloud` logged in, with billing enabled on the project. On Windows, `gcloud run
  worker-pools` needs the `grpc` module; the script switches to the SDK's bundled Python
  (`CLOUDSDK_PYTHON`) automatically when the default interpreter lacks it.
- Bash (Git Bash works on Windows), `curl`, `openssl`.
- A `.env` (gitignored) with:

```
DATABASE_URL=postgresql://...-pooler...neon.tech/neondb?sslmode=require   # pooled: the app's Prisma client
DIRECT_URL=postgresql://...neon.tech/neondb?sslmode=require               # direct: migrations and pg-boss
AUTH_GITHUB_ID=...
AUTH_GITHUB_SECRET=...
AUTH_SECRET=...                    # optional: generated if absent and no secret exists yet
# optional, for an automatic backup branch before migrating:
NEON_API_KEY=...
NEON_PROJECT_ID=...
```

Pooled vs direct: the app's queries go through Neon's PgBouncer (`-pooler` host) so many
short-lived Cloud Run instances share few server connections. pg-boss needs session-level
features (advisory locks, LISTEN) and Prisma migrations need a real session, so both use the
direct host.

## Deploy, end to end

```bash
set -a; . ./.env; set +a
PROJECT=gen-lang-client-0005933941 ./deploy/deploy_cloud_run.sh backup apis secrets image migrate web
```

Then cut the worker over (next section), then:

```bash
PROJECT=gen-lang-client-0005933941 RAILWAY_WORKER_STOPPED=yes WORKER_CPU=1 ./deploy/deploy_cloud_run.sh worker status
```

Steps can be run one at a time; each is idempotent (re-running `secrets` only adds a new
secret version when a value changed). Later deploys: `image migrate web worker`.

`backup` creates a Neon branch of the production branch via the Neon API (or runs `pg_dump`
if installed). Without either it stops, so a migration never runs without a backup; if you
make the branch yourself in the Neon console, skip the step.

## Moving the worker from Railway (or any other host)

Two workers must never consume the same queues at the same time. The `worker` step refuses
to run unless `RAILWAY_WORKER_STOPPED=yes`. Before setting it:

1. In Railway, open the worker service (start command `npm run worker`) and remove its
   active deployment (or confirm "There is no active deployment for this service").
2. Turn off its "Auto deploy" from GitHub, so a push to `main` cannot start it again.
3. Only then deploy the worker here.

Railway's web service can keep running during the move: it only enqueues jobs, it never
consumes them.

Redeploying the worker pool itself briefly overlaps two revisions (observed: the new one
listening 9 s before the old one logged `worker.stopping` on SIGTERM). That is safe: pg-boss
gives each job to one consumer (`SKIP LOCKED`) and every handler claims its row with a
conditional update, so a job is never processed twice. The rule above is about a second,
unmanaged worker on another host that you cannot see or stop from here.

## Cold start (web, min 0)

Measured on this deployment after 16+ minutes idle (details: PHASES.md, Phase 5):

| Build | First request on a new instance (Cloud Run log) |
|---|---|
| `next start` | 14.09 s (6.6 s until the port opened, 2.1 s transpiling `next.config.ts`) |
| standalone `server.js` (current), 2 cold starts | 3.71 s and 1.94 s (port open after 2.5 s / 1.3 s, config load 18–20 ms); 2.51 s to first byte from a client |

The first API call on a new instance adds ~2 s for pg-boss start and database connections.
`--min-instances=1` on `eval-web` would remove cold starts at the price of an idle instance;
it is left at 0 to keep idle cost at the worker alone.

## GitHub sign-in

Auth.js uses a GitHub App's OAuth credentials. The app must list
`<URL>/api/auth/callback/github` as a redirect URI (GitHub Apps allow up to 10, so localhost
and older hosts can stay). `AUTH_URL` is set to the service's deterministic URL
(`https://<service>-<project number>.<region>.run.app`), which is known before the first
deploy; `eval-auth-secret` signs the session JWTs.

## Region

The web service and worker run in `us-central1`; the Neon database is in AWS `us-east-1`.
Every request makes several sequential database round trips, so this distance shows up in
latency (see the measurements). GCP `us-east4` (Virginia) is the closest Cloud Run region to
Neon's `us-east-1`; moving there is a one-variable change (`REGION=us-east4`) plus a new OAuth
redirect URI.

## Rollback

- Code: `gcloud run services update-traffic eval-web --to-revisions=<previous>=100` and
  redeploy the worker pool from the previous image tag.
- Database: the migrations here only add tables, columns and indexes; the Neon branch made
  before migrating is the full restore point.
