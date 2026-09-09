# Phase 12 — Expense Vertical Slice

Status: IMPLEMENTED IN SOURCE / DATABASE MAIN NOT APPLIED
Version: 0.12.0

## Delivered
- Record Expense command and validation.
- Atomic PENDING → POSTED transaction write.
- Idempotency by authenticated user + key.
- Ownership/state validation for cycle, account, category, and approved plan.
- Budget impact: planned, actual, remaining, utilization, NORMAL/OVER_BUDGET.
- AT_RISK deliberately left behind pending rule interface.
- Financial impact query after posting.
- Safe To Spend final amount intentionally blocked by ISSUE-0002 (Required Financial Buffer).
- Daily Safe and Expected Deficit therefore not fabricated.
- Arabic RTL expense screen and recent-expense list.

## Financial safety decisions
- Buffer=0 is NOT used as a production default.
- Forecast algorithm is NOT implemented here.
- AT_RISK threshold is NOT invented.
- Posted financial transaction is the actual source of truth.

## Database
No new SQL migration is required for expense fields; they already exist in `20260902_005_transactions_obligations.sql`.
The Drizzle schema was synchronized with those existing columns.

## Remaining environment limitation
Full `pnpm lint/typecheck/test/build` requires project dependencies to be installed in the runtime.
Neon main branch remains untouched until a safe branch/migration path is available.
