# Phase 11 — Income Vertical Slice

Status: **IMPLEMENTED IN CODE / DATABASE MIGRATION NOT APPLIED TO NEON MAIN**

## Implemented
- Actual income command with authoritative server validation.
- Financial transaction lifecycle `PENDING → POSTED` inside one database transaction.
- Idempotency protection using `(user_id, idempotency_key)`.
- Ownership checks for active cycle, active account, and optional expected-income link.
- Actual income metadata persisted explicitly: source, kind, partial/full receipt, expected-income link.
- Account liquidity increases through the existing `account_balances_v` view only after `POSTED`.
- Expected vs actual variance uses the deterministic `Money` value object, not JavaScript floating-point arithmetic.
- Below-expected income returns `requiresPlanReview=true`; it does **not** silently mutate an approved plan.
- Above-expected income is reported as surplus and never auto-added to flexible spending.
- Server-rendered RTL entry and result screens.

## Deliberately not implemented
- Silent automatic changes to an approved plan.
- Final Safe To Spend production result while Required Financial Buffer remains unresolved.
- Final Forecast algorithm.

## Database synchronization
Migration `20260902_010_income_expected_link.sql` extends the physical transaction model to preserve fields required by API-C-010. This should be reflected in `DATABASE_SCHEMA.md` during the next documentation synchronization pass.

## Environment limitation
The Neon main branch is still intentionally untouched because the available connector's branch-creation path has been failing before a safe temporary-branch migration can be completed. Full `pnpm lint/typecheck/test/build` is also not claimed in the current execution environment unless dependencies are available.
