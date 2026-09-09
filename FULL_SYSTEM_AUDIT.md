# Full System Audit — Phase 40

## Scope
Full-source audit of the personal finance advisor after Phase 39. The audit covers source structure, deprecated/duplicate scaffolding, internal imports, state-machine authority, app/repository boundaries, database-write boundaries, security/performance/regression gates, and production blockers.

## Corrected during this audit
1. Removed direct repository imports from the Next.js app layer in the income screens. The UI now calls feature query functions instead of importing repositories directly.
2. Added `getIncomeReceipt()` as a feature query that owns receipt aggregation (transaction + variance + account balance).
3. Reused the canonical `listAccounts()` query in the income-entry page instead of calling `accountRepository` from the page.
4. Removed obsolete `.gitkeep` placeholders and empty scaffold-only source directories (`application`, `components`, `recommendations`, `validation`).
5. Verified there is one central workflow state-machine engine (`src/state-machines/engine.ts`) and no deprecated `state-machine-engine.ts` remains.
6. Verified no Supabase runtime references remain in `src`.
7. Verified internal `@/` and relative imports resolve to existing source modules via static import-resolution scan.

## Findings that are acceptable by design
- Repository implementations use raw SQL because the project chose explicit PostgreSQL/Neon persistence and atomic transaction boundaries.
- A few feature-level orchestration modules still execute raw SQL where the operation spans multiple repositories/entities (notably onboarding finalization, recommendation batch persistence, weekly job orchestration). These are not UI-layer writes and are currently intentional transaction boundaries.
- AI remains explanation-only and has no direct DB authority.
- Forecast and Safe To Spend remain blocked where unresolved business rules would otherwise require invented financial values.

## Open production gates — NOT treated as pass
1. **SECURITY-GATE-001 — Neon least-privilege runtime role**: production must not connect as database owner; RLS must be tested using the actual runtime role.
2. **SECURITY-GATE-002 — real package lock + dependency audit**: `package-lock.json` is still absent because the current execution environment cannot reach the npm registry. A real lockfile must be generated and audited before production.
3. **REGRESSION-GATE-001 — executable full Vitest suite**: source/contract verification exists, but full dependency-backed test execution needs an environment with installed packages.
4. **REGRESSION-GATE-002 — Neon staging integration/RLS tests**: requires a real staging branch/database and at least two isolated test identities.
5. **REGRESSION-GATE-003 — browser E2E**: onboarding, income, expense, obligation, saving, emergency, goal, advisor, reports, and cycle closing require browser execution in staging.
6. **PERFORMANCE-GATE-001 — staging p50/p95 measurement**: structural N+1 fixes and indexes are present, but real latency cannot be claimed without representative staging data.
7. **BUSINESS-RULE GATES**: Required Financial Buffer, Forecast formula, AT_RISK threshold, Financial Health formula, multi-goal constrained allocation, and emergency coverage derivation remain unresolved by design.
8. **OPERATIONAL-DEPLOY GATE**: the public Netlify link is still intentionally routed to static `/preview`; the real operational application must be connected to Neon + Better Auth + applied migrations before UAT.

## Audit conclusion
The source is materially cleaner and the known duplicate/deprecated scaffolding found in earlier phases has been removed. No critical source-layer defect was found that justifies inventing a financial rule or rewriting financial history. The system is ready to proceed to staging preparation, but it is **not production-ready** until the explicit gates above are closed and verified in a real staging environment.
