# Release 1.0.0 — Production V1

The Personal Finance Advisor reaches its first production semantic release.

## Included
- Complete personal financial-cycle workflow.
- Accounts, expected/actual income, financial plans and revisions.
- Expenses, refunds, transfers, obligations, savings, emergency fund, and financial goals.
- Deterministic Safe To Spend, daily safe limit, budget risk, forecast, emergency coverage, goal analysis, and Financial Health.
- Financial advisor/recommendation workflows.
- Historical cycle closing/snapshots and reports.
- Bank-statement/merchant intelligence and later operational decision packages already delivered in prior phases.
- Mobile/tablet/desktop RTL interaction system.
- Production health/readiness, smoke, status, stability, recovery and performance contracts.

## Final data-integrity change
Migration 65 resolves goal-contribution account-ledger semantics: the selected `account_id` is the source account and each posted `GOAL_CONTRIBUTION` is an OUT ledger movement while also increasing the goal balance.

## Database
Migration inventory: 65.

## Release state
`1.0.0` is the final V1 production package. Deployment acceptance remains subject to the repository's Netlify quality gate and the post-deploy operational checks.
