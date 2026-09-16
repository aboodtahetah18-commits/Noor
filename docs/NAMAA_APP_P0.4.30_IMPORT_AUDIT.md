# Namaa App P0.4.30 import audit

## Source
- User-requested label: `Namaa_App_P0.4.29_FINAL_UI.zip`
- Actual uploaded artifact inspected: `Namaa_App_P0.4.30_BRAND_FINAL.zip`
- Sanitized runtime artifact: `Namaa_App_P0.4.30_BRAND_FINAL_SANITIZED.zip`
- Sanitized artifact SHA-256: `f7098556534e68ea186a4e934d9cdb24871c1bf02e551758cefed6be928ae14b`
- Source project files inspected: 242
- Zip-slip/path traversal: none detected
- Actual `.env` files: none; `.env.example` only

## Repository baseline
- Repository: `aboodtahetah18-commits/Noor`
- Default branch: `main`
- Baseline commit: `c9db184ca7607c60fb4e38e380fb249402b2fb56`
- Baseline tree: `85f7035cebfbbb9ba0cee0cade00fc56a9b7a02a`

The existing repository is materially broader than the uploaded UI package and contains financial-engine, governance, database, tests, production checks, and Stage 4 governed runtime binding. Therefore this import does not delete repository-only source or mutate the production database.

## Explicit safety exclusions
The following artifact migrations were inspected but are intentionally NOT imported or executed because they change ownership, grants, or RLS policy:
- `migrations/P0.4.10_multi_user_ownership_constraints.sql`
- `migrations/P0.4.10_rls_deferred_until_app_role.sql`
- `migrations/P0.4.11_enable_rls_conversation_journey.sql`
- `migrations/P0.4.11_namaa_app_role_grants.sql`
- `migrations/P0.4.12_runtime_role_grants.sql`
- `migrations/P0.4.13_enable_rls_user_isolation.sql`

No Neon main connection, production migration, RLS change, grant change, or database mutation was executed.

## Byte-safe transport
The sanitized ZIP is stored in the configured project folder in Google Drive. `scripts/materialize-namaa-final-ui.sh` downloads that exact object during CI/Vercel build, verifies its SHA-256 before extraction, and fails closed if the hash differs.

The materializer also fails closed if any `migrations/` path or runtime `.env` file appears in the sanitized artifact.

## Compatibility patch
After the archive passes the hash check, `scripts/patch-namaa-final-ui-compat.mjs` applies only deterministic compatibility fixes required by Next.js/TypeScript:
- type compatibility for the agents directory,
- nullable `threadId` state typing,
- a local `pdf-parse` TypeScript declaration,
- `force-dynamic` for `/signup` so its registration-availability query runs at request time instead of build time.

These changes do not alter financial policy, automatic-execution rules, database schema, RLS, grants, or production data.

## Brand safety
The artifact contains the transparent implementation logo assets protected by the brand manifest. No generated or guessed replacement logo is introduced. They remain implementation assets, not a claimed Master SVG.

## Product invariants checked
- No automatic real-world financial execution is introduced.
- User remains the actor who performs transfers/payments/investments externally.
- User confirmation is not treated as verification.
- Mobile UI includes a Chat-first gate.
- No mock/fixture/dummy finance data was found in the inspected runtime UI source.
- Disabled/unconnected UI capabilities are presented as unavailable rather than falsely active.

## CI verification
On the exact sanitized artifact after the compatibility patch:
- artifact materialize + SHA-256 verification: PASS
- dependency installation: PASS
- `npm run typecheck`: PASS
- `npm run qa:ui-all`: PASS
- `npm run build`: PASS
- Noor repository Quality Gate: PASS

## Vercel preview routing
The branch routes `vercel:build` to the materialized P0.4.30 application and sets the Vercel output directory to `apps/namaa-final-ui/.next`, so the preview target is the imported UI rather than the legacy Noor UI.

The current Vercel status failure is an external `build-rate-limit` condition, not a code/build failure; GitHub production build passed.

## Production merge gate
The existing Noor production deployment has `/api/jobs/financial-engine`, while the standalone P0.4.30 UI package does not contain that route. Production merge must therefore preserve the existing backend financial-engine path rather than replacing it implicitly.

Import status: **runtime artifact verified and preview-wired; production merge held only for backend preservation**.
