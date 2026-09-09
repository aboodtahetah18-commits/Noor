# Phase 1 — Database Foundation Status

## Status

**IMPLEMENTED / RUNTIME VERIFICATION PENDING**

## Implemented

- 10 versioned PostgreSQL/Supabase migrations.
- Profiles bootstrap from `auth.users`.
- Accounts and opening balances.
- Financial cycles, expected income, plans, versions, categories and allocations.
- Transactions, transfer header, obligations.
- Savings, emergency fund, goals.
- Recommendations, snapshots, reviews, state transition logs and centralized idempotency records.
- Monetary columns use `NUMERIC(18,2)`; no floating-point money.
- Required uniqueness, check constraints and indexes.
- `account_balances_v` based on opening balance and unambiguous POSTED ledger movements.
- Immutable snapshot / category snapshot / state-transition protections.
- RLS enabled on all sensitive tables, including child-only emergency withdrawal details.
- Direct authenticated writes intentionally limited for financial-history tables; sensitive writes remain server-command operations.
- SQL schema/RLS contract checks and Vitest migration contract checks.

## Explicit boundary

The physical account movement for `SAVING_TRANSFER`, `EMERGENCY_CONTRIBUTION`, `EMERGENCY_WITHDRAWAL`, and `GOAL_CONTRIBUTION` is not invented in Phase 1. API contracts include source/destination semantics that are not fully represented by the current transaction table. Until that downstream physical-ledger contract is formally synchronized, these specialized transaction types are excluded from `account_balances_v`. This prevents an incorrect balance algorithm from becoming authoritative.

Generic `TRANSFER` is implemented according to the approved `Transfer Header + Two Ledger Entries` direction model.

## Verification performed in this environment

- Confirmed all migration files are transaction-wrapped (`BEGIN` / `COMMIT`).
- Confirmed required migration/test files exist.
- Static migration-contract tests were added.

## Verification not executable in this environment

The current runtime does not provide `pnpm`, Supabase CLI, PostgreSQL `psql`, or installed project dependencies. Therefore migrations could not be applied to a live local Supabase instance here, and `pnpm lint/typecheck/test/build` could not be rerun.

Before Phase 1 is marked **VERIFIED**, run in a development/staging environment:

```bash
pnpm install
supabase start
supabase db reset
# Execute supabase/tests/001_schema_contract.sql and 002_integrity_constraints.sql
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Next phase

**Phase 2 — Authentication**

Scope: Sign in, sign out, session validation, protected application shell, public auth routes, and unified `requireAuthenticatedUser()` ownership context.
