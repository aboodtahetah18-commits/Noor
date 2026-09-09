# Netlify Preview Infrastructure Fix — 2026-09-02

## Status
Prepared a deployment-hardening patch on top of Phase 16. The previous screenshot proves the deploy failed during Netlify initialization, but it does not expose the exact failing log line; therefore the exact historical root cause cannot be asserted from that screenshot alone.

## Known deployment fragility removed
- Pinned Node.js 24.20.0 in repository-controlled files.
- Standardized the preview build on npm 11.x; the repository had declared pnpm but contained no `pnpm-lock.yaml`.
- Added `netlify.toml` with an explicit `npm run build` command.
- Added automatic Netlify deploy URL resolution for Better Auth (`DEPLOY_PRIME_URL`, `DEPLOY_URL`, `URL`).
- Added dynamic trusted origins for Netlify preview URLs.
- Made Neon client initialization lazy so importing repositories during `next build` does not require opening a database connection.
- Made Better Auth initialization lazy; authentication secrets and DB config are checked when auth is actually used rather than merely when modules are imported.
- Added `/api/health` without exposing secrets.

## Required before authenticated preview use
Netlify must have:
- `DATABASE_URL`

The database URL should point to a dedicated Neon preview/staging branch whose schema is migrated through Phase 16.

## Neon branch
A safe preview branch was attempted through the connected Neon tool. The connector's advertised schema accepted `projectId`/`branchName`, but its runtime rejected those keys and expected different internal argument names. Therefore no Neon branch was created and the Neon main branch was not touched.

## Verification limitation
The execution environment has no registry internet access, so dependencies cannot be installed here and a complete `npm install && npm run build` cannot be executed locally. The project therefore needs one Netlify redeploy to validate the platform build and reveal any remaining code-level compiler error.
