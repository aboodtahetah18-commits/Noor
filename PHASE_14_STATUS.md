# Phase 14 — Transaction Reversal

Status: IMPLEMENTED IN SOURCE / DATABASE MAIN NOT APPLIED
Version: 0.14.0

## Delivered
- Documented reversal for currently implemented safe transaction types: INCOME and EXPENSE.
- Authoritative transaction state transition: POSTED → REVERSED.
- Mandatory reversal reason stored on the transaction and in StateTransitionLog.
- `reversed_at` timestamp and immutable audit trail.
- Reversal is blocked for CLOSING/CLOSED cycles.
- Generic reversal is deliberately blocked for specialized transaction types until their linked domain entity can be reversed atomically.
- Idempotency contract tightened for retries/concurrent duplicate reversal attempts.
- Transaction detail UI exposes reversal only for supported POSTED transactions.
- Reversal financial impact returns account balance after reversal and, for expenses, category actual/remaining/utilization.
- Safe To Spend remains explicitly blocked by ISSUE-0002 rather than assuming a production financial buffer.
- New database migration adds authoritative `reversal_reason` integrity.

## Historical integrity
- The original transaction row remains in the ledger history.
- No DELETE is used for correction.
- REVERSED transactions cease to contribute to POSTED-derived balances and actual spending.
- REVERSED → POSTED remains forbidden by the State Machine.

## Specialized reversal boundary
The generic Phase 14 handler supports INCOME and EXPENSE only. Types such as OBLIGATION_PAYMENT, GOAL_CONTRIBUTION, EMERGENCY_* and SAVING_TRANSFER require a specialized reversal handler so the linked domain entity and transaction state change atomically. TRANSFER and REFUND are not yet implemented in the product sequence.

## Verification
- Structural/source tests cover POSTED-only reversal, audit, idempotency, cycle lock, ownership and specialized-type guard.
- Full `pnpm lint/typecheck/test/build` cannot be claimed in the current runtime because dependencies are not installed and pnpm is unavailable.
- Neon main branch remains untouched until the safe branch migration workflow is available.
