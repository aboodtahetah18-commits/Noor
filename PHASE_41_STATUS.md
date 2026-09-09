# Phase 41 — Staging Deployment Preparation

Status: PARTIALLY COMPLETE — application-side staging package complete; Neon branch creation is blocked by the connected Neon tool parameter mismatch.

## Completed

- Converted Netlify configuration from static preview mode to operational staging mode.
- Removed `PREVIEW_MODE=true` and root `/preview` redirect.
- Added build-time staging environment preflight.
- Added secure secret generator.
- Added ordered migration runner with explicit staging-only and opt-in guards.
- Added `schema_migrations` ledger to prevent accidental reapplication.
- Added Phase 41 structural verifier.
- Documented all Netlify variables and staging migration steps.
- Confirmed migration inventory contains 23 SQL files.

## External blocker

The connected Neon tool currently exposes camelCase `projectId` but the Neon MCP runtime rejects it and requests `project_id`. As a result, this session could not safely create the staging branch or retrieve its connection string. No change was made to the Neon main branch.

## Next operational action

Create the Neon staging branch, obtain its `DATABASE_URL`, run all 23 migrations on that branch, then configure Netlify staging variables and redeploy.

## Operational staging switch — 0.41.4
- Root is session-aware: unauthenticated -> `/login`, authenticated -> `/dashboard`.
- `/preview` is optional only, not the default entrypoint.
- Removed PREVIEW_MODE bypass from protected layout and mutation-origin guard.
- Removed preview-only fake DB/auth fallbacks from environment loading.
