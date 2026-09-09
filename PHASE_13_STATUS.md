# Phase 13 — Transaction History

Status: IMPLEMENTED IN SOURCE / DATABASE MAIN NOT APPLIED
Version: 0.13.0

## Delivered
- Unified transaction history for all transaction types.
- API-Q-010 aligned filters: pagination, dates, type, category, account, planning status, search, sorting.
- Transaction detail query scoped to authenticated owner.
- Arabic RTL transaction history and details pages.
- Page-size hard cap of 100.
- Fixed sort allowlist; no arbitrary SQL column injection.
- Supporting transaction-history indexes migration.
- Unit/integration source tests for filters, ownership and pagination.

## Historical integrity
- The list includes operational statuses without deleting financial history.
- POSTED transactions remain immutable in this phase.
- Correction/reversal behavior is deliberately deferred to Phase 14.

## Environment/database limitation
- Neon main branch remains untouched until the safe branch workflow can be exercised.
- Full pnpm lint/typecheck/test/build still requires dependencies available in the execution runtime.
