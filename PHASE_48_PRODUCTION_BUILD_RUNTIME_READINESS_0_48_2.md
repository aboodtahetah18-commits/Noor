# P48.1 + P48.2 — Production Build, Route & Runtime Readiness

## P48.1 — Production build and route integrity

- Added a route-integrity verifier that discovers all application pages and validates static internal links against real routes.
- Current scan: 66 pages and 124 static internal links.
- The operational `/` route remains the entrypoint and routes authenticated users to `/dashboard` and unauthenticated users to `/login`.
- `/preview` is now development-only. Synthetic financial values are not exposed as an operational staging/production route.
- Added `verify:routes` script.

## P48.2 — Netlify / Neon runtime readiness

- Replaced a staging-only deployment assumption with context-aware deployment policy.
- Production Netlify context uses `APP_ENV=production` and explicit migration opt-in.
- Deploy Preview and branch deploy use `APP_ENV=staging` with automatic migrations disabled.
- Added generic `deploy:preflight` and `deploy:migrate` scripts while retaining backward-compatible staging aliases.
- Migration execution remains idempotent through `public.schema_migrations` and is explicitly blocked for Netlify Deploy Preview.
- Added `/api/ready`, which validates server configuration and performs a minimal Neon database query. It returns HTTP 503 when the runtime is not ready.
- `/api/health` remains a lightweight liveness endpoint and is intentionally separate from readiness.
- Confirmed runtime source uses Neon and has no Supabase runtime imports under `src/`.

## Dependency/build limitation in this execution environment

The supplied project package does not contain `node_modules` or `package-lock.json`. An attempt to generate/install the dependency graph in this execution environment timed out due package-registry access, and the local runtime is Node 22 while the repository pins Node 24.20.x for Netlify.

Therefore this phase does **not** claim a completed local `next build`. Netlify remains the authoritative full-build environment for this package until dependency installation can run with the pinned runtime.

## Database

No schema change. Migration inventory remains 64.
