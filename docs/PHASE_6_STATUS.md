# Phase 6 — Accounts Vertical Slice

Status: IMPLEMENTED LOCALLY / DATABASE APPLICATION PENDING SAFE NEON BRANCH PATH

## Delivered
- Create Account command.
- Atomic account + opening-balance creation.
- List Accounts query.
- Account Details query.
- Deactivate Account command (history-preserving; no destructive delete).
- Server-side ownership enforcement using authenticated user ID.
- Account balance read from `account_balances_v`, never from a mutable `accounts.balance` field.
- `WF-002`, `WF-100`, `WF-101`, `WF-102` initial executable UI.
- Independent mobile card layout.
- Exact display formatting based on bigint-backed Money utility; no authoritative JavaScript floating-point arithmetic.
- Unit/integration contract tests added.

## Financial integrity
Opening balance is a one-time setup record in `account_opening_balances`. Current balance is derived from opening balance and POSTED ledger entries. Account deactivation retains financial history.

## Security
Repository operations always scope resources by the authenticated `userId`. Account IDs supplied by the browser are never sufficient for ownership.

## Current infrastructure limitation
The Neon project exists, but the connector's branch-creation path is still failing due to an internal argument-name mismatch. The main Neon branch has therefore not been modified directly. Phase 6 code and migrations remain ready for safe application once a temporary-branch path is available.

## Known dependency
The existing implementation issue for `SAVING_TRANSFER`, emergency and goal contribution ledger legs remains open. Until those vertical slices define their approved account-side ledger semantics, `account_balances_v` intentionally reflects only transaction types whose account direction is already approved.

## Verification performed in this environment
- Structural source verification: PASS.
- Financial-engine bigint money formatting path: reviewed.
- Full project `pnpm lint/typecheck/test/build`: NOT RUN because dependencies/pnpm are unavailable in this runtime.
- Global `tsc` was attempted and fails primarily because project dependencies are not installed; this is not recorded as a passing quality gate.
