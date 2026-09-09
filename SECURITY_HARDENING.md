# Phase 37 — Security Hardening

## Applied controls

- Cookie-authenticated financial mutations use an explicit trusted-origin/CSRF guard in addition to Next.js Server Action protections.
- All protected Server Action modules pass through an authenticated mutation boundary; client-supplied `user_id` is never accepted as identity.
- Best-effort per-instance rate limiting is present as defense-in-depth. It is not a replacement for idempotency or database constraints.
- Security headers are set globally: CSP, clickjacking protection, nosniff, referrer policy, permissions policy, COOP/CORP, and HSTS in production.
- Private financial routes use `private, no-store` cache policy.
- Health endpoint no longer exposes database/auth configuration state.
- Technical error logging uses request IDs and redacts secret/financial metadata.
- Text/idempotency inputs in hand-written validators have technical maximum lengths.
- PostgreSQL RLS is enabled for financial tables and PUBLIC table/sequence privileges are revoked.
- AI explanation remains outside direct database/write authority.

## Production gates still open

### SECURITY-GATE-001 — Least-privilege Neon runtime role
The RLS migration defines owner-isolation policies using `app.current_user_id`. A dedicated runtime DB role must be created and the application DB access layer must set this tenant context per request/transaction. The Neon database owner must remain migration/operations-only because PostgreSQL owners bypass ordinary RLS.

### SECURITY-GATE-002 — Dependency lockfile
`package-lock.json` is required before production. The current execution environment cannot reach the npm registry, so a valid lockfile could not be generated here without fabricating dependency metadata. Generate and commit it in a registry-connected environment, then run `npm ci`, audit, tests, and build.

### Deployment decisions intentionally not invented
Exact production rate limits, final nonce/hash-based CSP policy, MFA/passkey policy, session duration, backup retention, and monitoring vendor remain deployment/operations decisions as specified by SECURITY.md.
