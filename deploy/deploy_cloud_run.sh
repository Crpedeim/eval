#!/usr/bin/env bash
# Deploy the eval platform to Google Cloud Run, keeping the existing Neon database.
#
#   set -a; . ./.env; set +a          # DATABASE_URL, DIRECT_URL, AUTH_* (see deploy/CLOUD_RUN.md)
#   PROJECT=my-gcp-project ./deploy/deploy_cloud_run.sh [step ...]
#
# Steps, in order (default: all of them):
#   backup   Neon branch of the production branch (or pg_dump) BEFORE anything touches the DB
#   apis     enable Cloud Run, Cloud Build, Artifact Registry, Secret Manager
#   secrets  create/refresh eval-* secrets in Secret Manager from the environment
#   image    build the container with Cloud Build into Artifact Registry
#   migrate  Cloud Run job: prisma migrate deploy (uses DIRECT_URL); enables pgvector
#   web      Cloud Run service eval-web (min 0)
#   worker   Cloud Run worker pool eval-worker (exactly 1 instance). Refuses to run until
#            RAILWAY_WORKER_STOPPED=yes: two workers must never consume the same queues.
#   status   print URLs, revisions and the OAuth callback to configure
#
# Nothing secret is printed or written to disk; values go straight into Secret Manager.
set -euo pipefail

PROJECT="${PROJECT:?set PROJECT to the GCP project id}"
REGION="${REGION:-us-central1}"
REPO="${REPO:-eval}"
WEB="${WEB_SERVICE:-eval-web}"
WORKER="${WORKER_NAME:-eval-worker}"
JOB="${MIGRATE_JOB:-eval-migrate}"
JUDGE_MODEL="${JUDGE_MODEL:-gemini-3.8-flash}"
RAG_RETRIEVAL="${RAG_RETRIEVAL:-}"
WEB_MAX="${WEB_MAX_INSTANCES:-3}"
# Existing secret holding the Gemini key (shared with other apps in the project), or empty
# to create eval-gemini-api-key from $GEMINI_API_KEY.
GEMINI_SECRET="${GEMINI_SECRET:-gemini-api-key}"

TAG="${TAG:-$(git rev-parse --short HEAD)}"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/eval-platform:$TAG"
STEPS=("$@")
[ ${#STEPS[@]} -eq 0 ] && STEPS=(backup apis secrets image migrate web worker status)

log() { printf '\n==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
need() { for v in "$@"; do [ -n "${!v:-}" ] || die "set $v (see deploy/CLOUD_RUN.md)"; done; }

gcloud config set project "$PROJECT" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
# Cloud Run's deterministic URL, known before the first deploy, so AUTH_URL can be set up front.
WEB_URL="${PUBLIC_URL:-https://$WEB-$PROJECT_NUMBER.$REGION.run.app}"
RUN_SA="${RUN_SA:-$PROJECT_NUMBER-compute@developer.gserviceaccount.com}"

# secret name in Secret Manager -> env var it is read from at deploy time / exposed as at runtime
declare -A SECRET_ENV=(
  [eval-database-url]=DATABASE_URL
  [eval-direct-url]=DIRECT_URL
  [eval-auth-secret]=AUTH_SECRET
  [eval-auth-github-id]=AUTH_GITHUB_ID
  [eval-auth-github-secret]=AUTH_GITHUB_SECRET
)
GEMINI_REF="${GEMINI_SECRET:-eval-gemini-api-key}"

secrets_flag() {  # secrets_flag NAME... -> ENV=secret:latest,...
  local out=() s
  for s in "$@"; do
    if [ "$s" = gemini ]; then out+=("GEMINI_API_KEY=$GEMINI_REF:latest")
    else out+=("${SECRET_ENV[$s]}=$s:latest"); fi
  done
  local IFS=,; echo "${out[*]}"
}

# gcloud's worker-pools commands need the grpc module; the SDK's bundled Python has it even
# when the system Python gcloud picked does not.
worker_pools_gcloud() {
  if gcloud run worker-pools deploy --help >/dev/null 2>&1; then return 0; fi
  local sdk; sdk="$(gcloud info --format='value(installation.sdk_root)')"
  for py in "$sdk/platform/bundledpython/python.exe" "$sdk/platform/bundledpython/bin/python3"; do
    if [ -x "$py" ] && CLOUDSDK_PYTHON="$py" gcloud run worker-pools deploy --help >/dev/null 2>&1; then
      export CLOUDSDK_PYTHON="$py"; return 0
    fi
  done
  return 1
}

step_backup() {
  log "backup the database before any migration"
  if [ -n "${NEON_API_KEY:-}" ] && [ -n "${NEON_PROJECT_ID:-}" ]; then
    local name="pre-cloud-run-$(date -u +%Y%m%d-%H%M%S)"
    # No parent_id: Neon branches from the project's default (production) branch at this instant.
    local res
    res="$(curl -fsS -X POST "https://console.neon.tech/api/v2/projects/$NEON_PROJECT_ID/branches" \
      -H "Authorization: Bearer $NEON_API_KEY" -H "Content-Type: application/json" \
      -d "{\"branch\":{\"name\":\"$name\"}}")" || die "Neon branch creation failed"
    echo "   created Neon branch $name ($(printf '%s' "$res" | sed -n 's/.*"branch":{"id":"\([^"]*\)".*/\1/p'))"
  elif command -v pg_dump >/dev/null; then
    need DIRECT_URL
    local f="backup-$(date -u +%Y%m%d-%H%M%S).dump"
    pg_dump --format=custom --no-owner --file="$f" "$DIRECT_URL"
    echo "   wrote $f ($(wc -c <"$f") bytes) - keep it out of git"
  else
    die "no backup method: set NEON_API_KEY + NEON_PROJECT_ID, or install pg_dump (or run with SKIP_BACKUP_STEP and back up yourself)"
  fi
}

step_apis() {
  log "enable APIs"
  gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com secretmanager.googleapis.com
}

put_secret() {  # put_secret NAME VALUE: create, or add a version only if the value changed
  local name="$1" value="$2"
  if ! gcloud secrets describe "$name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic >/dev/null
    echo "   created $name"
  elif [ "$(gcloud secrets versions access latest --secret="$name" 2>/dev/null)" != "$value" ]; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- >/dev/null
    echo "   updated $name (new version)"
  else
    echo "   unchanged $name"
  fi
  gcloud secrets add-iam-policy-binding "$name" --member="serviceAccount:$RUN_SA" \
    --role=roles/secretmanager.secretAccessor >/dev/null
}

step_secrets() {
  log "secrets -> Secret Manager (runtime identity $RUN_SA)"
  need DATABASE_URL DIRECT_URL AUTH_GITHUB_ID AUTH_GITHUB_SECRET
  if [ -z "${AUTH_SECRET:-}" ] && ! gcloud secrets describe eval-auth-secret >/dev/null 2>&1; then
    AUTH_SECRET="$(openssl rand -base64 32)"; echo "   generated AUTH_SECRET"
  fi
  local s
  for s in "${!SECRET_ENV[@]}"; do
    local v="${!SECRET_ENV[$s]:-}"
    if [ -n "$v" ]; then put_secret "$s" "$v"
    else gcloud secrets describe "$s" >/dev/null 2>&1 || die "missing ${SECRET_ENV[$s]} and no secret $s"; fi
  done
  if [ "$GEMINI_REF" = eval-gemini-api-key ]; then need GEMINI_API_KEY; put_secret eval-gemini-api-key "$GEMINI_API_KEY"
  else
    gcloud secrets describe "$GEMINI_REF" >/dev/null 2>&1 || die "secret $GEMINI_REF not found"
    gcloud secrets add-iam-policy-binding "$GEMINI_REF" --member="serviceAccount:$RUN_SA" \
      --role=roles/secretmanager.secretAccessor >/dev/null
    echo "   using existing $GEMINI_REF for GEMINI_API_KEY"
  fi
}

step_image() {
  log "image $IMAGE"
  gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1 ||
    gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION"
  gcloud builds submit --tag "$IMAGE" --region="$REGION" .
}

step_migrate() {
  log "migrations: prisma migrate deploy as Cloud Run job $JOB"
  gcloud run jobs deploy "$JOB" --image="$IMAGE" --region="$REGION" \
    --set-env-vars=ROLE=migrate --set-secrets="$(secrets_flag eval-direct-url eval-database-url)" \
    --max-retries=0 --task-timeout=600 --cpu=1 --memory=1Gi
  gcloud run jobs execute "$JOB" --region="$REGION" --wait
}

step_web() {
  log "web service $WEB -> $WEB_URL"
  gcloud run deploy "$WEB" --image="$IMAGE" --region="$REGION" \
    --set-env-vars="ROLE=web,AUTH_URL=$WEB_URL,AUTH_TRUST_HOST=true,JUDGE_MODEL=$JUDGE_MODEL${RAG_RETRIEVAL:+,RAG_RETRIEVAL=$RAG_RETRIEVAL}" \
    --set-secrets="$(secrets_flag eval-database-url eval-direct-url eval-auth-secret eval-auth-github-id eval-auth-github-secret gemini)" \
    --allow-unauthenticated --min-instances=0 --max-instances="$WEB_MAX" \
    --cpu=1 --memory=1Gi --concurrency=40 --timeout=60 --cpu-boost
}

step_worker() {
  log "worker $WORKER"
  if [ "${RAILWAY_WORKER_STOPPED:-}" != yes ]; then
    die "stop the Railway worker first, confirm it has no running deployment, then rerun with RAILWAY_WORKER_STOPPED=yes"
  fi
  local env="ROLE=worker,JUDGE_MODEL=$JUDGE_MODEL${RAG_RETRIEVAL:+,RAG_RETRIEVAL=$RAG_RETRIEVAL}"
  local sec; sec="$(secrets_flag eval-database-url eval-direct-url gemini)"
  if worker_pools_gcloud && [ "${WORKER_AS_SERVICE:-}" != yes ]; then
    # Worker pool: no HTTP endpoint, no request-driven scaling, billed per instance-second
    # at a lower rate than an always-on service. Exactly one instance: pg-boss is safe with
    # more, but one keeps the queue order and the bill predictable.
    gcloud run worker-pools deploy "$WORKER" --image="$IMAGE" --region="$REGION" \
      --set-env-vars="$env" --set-secrets="$sec" --instances=1 --cpu=1 --memory=512Mi
  else
    # Fallback: a service with a health endpoint, one instance always on, CPU always allocated.
    gcloud run deploy "$WORKER" --image="$IMAGE" --region="$REGION" \
      --set-env-vars="$env" --set-secrets="$sec" --no-allow-unauthenticated \
      --no-cpu-throttling --min-instances=1 --max-instances=1 --cpu=1 --memory=512Mi
  fi
}

step_status() {
  log "status"
  gcloud run services describe "$WEB" --region="$REGION" --format='value(status.url,status.latestReadyRevisionName)' || true
  if worker_pools_gcloud; then
    gcloud run worker-pools describe "$WORKER" --region="$REGION" --format='value(metadata.name,status.latestReadyRevisionName)' 2>/dev/null || true
  fi
  echo
  echo "Web:                 $WEB_URL"
  echo "GitHub OAuth app ->  Homepage URL:               $WEB_URL"
  echo "                     Authorization callback URL: $WEB_URL/api/auth/callback/github"
}

for s in "${STEPS[@]}"; do
  case "$s" in
    backup|apis|secrets|image|migrate|web|worker|status) "step_$s" ;;
    *) die "unknown step: $s" ;;
  esac
done
