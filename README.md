# المستشار المالي الشخصي — Personal Finance Advisor

## Current release
**V1.5.0 — Current governed release baseline**

Arabic-first, RTL personal-finance application built with Next.js, PostgreSQL/Neon, Better Auth, Drizzle ORM and deterministic financial domain logic.

## Implemented product scope
- Owner authentication, profile and account security.
- Accounts and opening balances.
- Expected and actual income.
- Financial planning and budget categories.
- Expenses, refunds and transaction history.
- Account transfers and protected-fund ledger behavior.
- Recurring obligations and payments.
- Savings and emergency-fund flows.
- Goals and source-account goal contributions.
- Deterministic forecast, Safe To Spend, budget risk and Financial Health.
- Advisor recommendations and decision history.
- Financial cycles, closing snapshots and reports.
- Arabic RTL responsive UI for mobile, tablet and desktop.
- Accessibility, security, recovery, performance and regression contracts.
- Production health/readiness and non-destructive live acceptance tooling.

## Runtime baseline
- Node `24.20.x`
- npm `11.x`
- npm package manager baseline `11.19.0`
- PostgreSQL / Neon via `DATABASE_URL`
- Netlify deployment command:

```bash
npm run deploy:preflight && npm run quality:gate && npm run deploy:migrate
```

## Quality and verification
```bash
npm run quality:gate
npm run verify:database-provider
npm run verify:runtime-surface
```

Post-deploy acceptance:

```bash
npm run ops:live-validate -- https://YOUR-SITE.netlify.app --report=live-production-acceptance.json
npm run ops:release-seal -- --live-report=live-production-acceptance.json
```

The release seal is fail-closed and requires an accepted live production validation report for the same package version.

## Database
Versioned migrations live under `database/migrations/`.

Current migration inventory: **66**.

## Current status and issues
- `CURRENT_RELEASE_STATUS.md` — current implementation/release status.
- `CURRENT_KNOWN_ISSUES.md` — current open-issue status and external release evidence notes.
- `REGRESSION_REPORT.md` — current regression closure summary.
- `PRODUCTION_RUNBOOK.md` and `P63_LIVE_PRODUCTION_ACCEPTANCE.md` — operational production procedures; the historical filename is retained for traceability.

Historical phase and reference documents are intentionally retained for traceability; they are not the current runtime status.
