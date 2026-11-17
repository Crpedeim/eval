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
