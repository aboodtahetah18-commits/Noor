# P51 — Production Closure & Release Candidate — v0.51.0

## Goal
Turn the accepted P50 application into an explicit production release candidate with a verifiable pre-deploy and post-deploy contract.

## Added
- `scripts/verify-p51.mjs`: validates Netlify production policy, runtime endpoints, security headers, root routing, migration inventory, and release compatibility.
- `scripts/postdeploy-smoke.mjs`: non-mutating live smoke test for an already-deployed HTTPS base URL.
- `npm run smoke:production -- https://example.netlify.app`: probes `/api/health`, `/api/ready`, `/`, and security headers without changing financial data.
- P51 is wired into the production quality gate before P50/P49 regression gates.

## Preserved
- Neon/PostgreSQL remains the only application database runtime.
- Production migrations remain explicit and Netlify-context governed.
- Deploy previews cannot run automatic database migrations.
- Migration inventory remains 64.
- P50/P49 behavior and UX contracts remain regression-protected.

## Runtime acceptance
The build-time quality gate cannot prove a URL that does not exist yet. After Netlify publishes a candidate, run the independent smoke command against the published HTTPS origin. A release is production-accepted only when both the Netlify quality gate and the post-deploy smoke pass.
