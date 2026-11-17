#!/usr/bin/env bash
# Deploy to Google Cloud Run: one image, a migration job, and two services.
#
#   PROJECT=my-gcp-project REGION=us-east1 ./scripts/deploy-gcp.sh
#
# Pick the REGION closest to your Neon database: every request makes several sequential
# round trips to it (see the README's "15-second transaction" story).
#
# Needs: gcloud logged in (`gcloud auth login`) with billing enabled on PROJECT.
# Missing secrets are prompted for (input hidden) and stored in Secret Manager.
set -euo pipefail

PROJECT="${PROJECT:?set PROJECT to your GCP project id}"
REGION="${REGION:-us-central1}"
REPO="${REPO:-eval}"
JUDGE_MODEL="${JUDGE_MODEL:-gemini-3.8-flash}"
TAG="$(git rev-parse --short HEAD)"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/eval-platform:$TAG"

WEB_SECRETS=(DATABASE_URL DIRECT_URL AUTH_SECRET AUTH_GITHUB_ID AUTH_GITHUB_SECRET GEMINI_API_KEY)
WORKER_SECRETS=(DATABASE_URL DIRECT_URL GEMINI_API_KEY)
MIGRATE_SECRETS=(DATABASE_URL DIRECT_URL)

secret_flags() { local IFS=,; local out=(); for s in "$@"; do out+=("$s=$s:latest"); done; echo "${out[*]}"; }

echo "==> project $PROJECT, region $REGION, image $IMAGE"
gcloud config set project "$PROJECT" >/dev/null
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

echo "==> secrets"
for s in "${WEB_SECRETS[@]}"; do
  if ! gcloud secrets describe "$s" >/dev/null 2>&1; then
    if [ "$s" = AUTH_SECRET ]; then
      value="$(openssl rand -base64 32)"
      echo "   generated AUTH_SECRET"
    else
      read -r -s -p "   value for $s: " value; echo
    fi
    printf '%s' "$value" | gcloud secrets create "$s" --data-file=- --replication-policy=automatic >/dev/null
    echo "   created $s"
  fi
done

SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
for s in "${WEB_SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding "$s" --member="serviceAccount:$SA" \
    --role=roles/secretmanager.secretAccessor >/dev/null
done

echo "==> image"
gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "$REPO" --repository-format=docker --location="$REGION"
gcloud builds submit --tag "$IMAGE" .

echo "==> migrations (Cloud Run job)"
gcloud run jobs deploy eval-migrate --image="$IMAGE" --region="$REGION" \
  --set-env-vars=ROLE=migrate --set-secrets="$(secret_flags "${MIGRATE_SECRETS[@]}")" \
  --max-retries=0 --execute-now --wait

echo "==> worker"
# Always-on: exactly one instance with CPU allocated outside requests, so it keeps polling.
gcloud run deploy eval-worker --image="$IMAGE" --region="$REGION" \
  --set-env-vars="ROLE=worker,JUDGE_MODEL=$JUDGE_MODEL" \
  --set-secrets="$(secret_flags "${WORKER_SECRETS[@]}")" \
  --no-allow-unauthenticated --no-cpu-throttling \
  --min-instances=1 --max-instances=1 --cpu=1 --memory=1Gi

echo "==> web"
gcloud run deploy eval-web --image="$IMAGE" --region="$REGION" \
  --set-env-vars="ROLE=web,AUTH_TRUST_HOST=true,JUDGE_MODEL=$JUDGE_MODEL" \
  --set-secrets="$(secret_flags "${WEB_SECRETS[@]}")" \
  --allow-unauthenticated --cpu=1 --memory=1Gi --max-instances=3

URL="$(gcloud run services describe eval-web --region="$REGION" --format='value(status.url)')"
gcloud run services update eval-web --region="$REGION" --update-env-vars="AUTH_URL=$URL" >/dev/null

echo
echo "Deployed: $URL"
echo "Last step: in your GitHub OAuth app, set the callback URL to"
echo "  $URL/api/auth/callback/github"
