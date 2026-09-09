# P52 — Live Production Smoke & Final Closure — v0.52.0

## Goal
Close the production-release path with a non-mutating post-deploy smoke contract that validates the deployed Netlify runtime after the build succeeds.

## Added
- `verify:p52` static production-closure contract.
- Hardened `smoke:production` with HTTPS-only execution, request timeout, no-store checks, HSTS/security-header checks, and non-mutating probes of critical public/protected routes.
- P52 runs first in the pre-migration production quality gate.

## Live smoke coverage
- `/api/health` => HTTP 200 + `status=ok` + `Cache-Control: no-store`.
- `/api/ready` => HTTP 200 + `status=ready` + `database=reachable` + no-store.
- `/` operational entry point with no 5xx and only expected auth redirects.
- Security headers including CSP, frame protection, referrer policy and HSTS.
- Non-mutating probes of `/login`, `/dashboard`, `/transactions`, `/advisor`, and `/settings` with no 5xx.

## Safety
The smoke script performs GET requests only and does not create, edit, delete, migrate, or post financial data.

## Database
No schema change. Migration inventory remains 64.

## Operational acceptance
Run after a successful Netlify production deploy:

`npm run smoke:production -- https://YOUR-SITE.netlify.app`

A deployed URL is required for the live check; the build-time P52 verifier validates that the smoke contract is correctly wired without pretending a live deployment was tested locally.
