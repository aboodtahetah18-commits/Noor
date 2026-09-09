# P50 — Full System Acceptance — v0.50.0

## Goal
Establish the release-candidate acceptance contract across authentication, protected navigation, critical finance modules, mutation surfaces, modal behavior, runtime health/readiness, database migration inventory, and deprecated-runtime exclusion.

## Acceptance scope
- Critical protected pages: dashboard, ledger, expenses, income, accounts, obligations, savings, emergency fund, goals, advisor, alerts, bank statements/operations, budget, reports, settings, and more hub.
- Server action surfaces for all mutating domains.
- Protected authentication guard and public login entry.
- Loading/error recovery surfaces.
- Shared action dialog accessibility contract.
- Mobile navigation entrypoints.
- `/api/health`, `/api/ready`, and auth runtime routes.
- Neon-only runtime; Supabase runtime references remain prohibited.
- Migration inventory remains exactly 64.
- Placeholder navigation remains prohibited.

## Result
The static acceptance contract passes locally. Full lint, typecheck, Vitest, Next production build, and live Neon readiness remain authoritative in Netlify where dependencies and production runtime are installed.

No database migration is introduced by P50.
