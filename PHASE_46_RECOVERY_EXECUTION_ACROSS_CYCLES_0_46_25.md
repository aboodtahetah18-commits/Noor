# P46.24 + P46.25 — Actual internal-funding recovery across cycles

## P46.24 — Actual recovery execution

- Recovery debt is created from **actual funded expense allocations only**.
- The approved-but-unused portion is not debt and is returned as unused authorization when usage closes.
- Principal and the configured 10% growth are preserved separately for audit.
- A repayment is executed as an internal account transfer from a user-selected operating account back to the original emergency/investment source account.
- The repayment transfer is neither income nor consumption expense and therefore has zero total-liquidity change.
- Payment requires an ACTIVE financial cycle and sufficient balance in the selected paying account.
- Each source uses a deterministic idempotency key per installment to prevent duplicate financial effect.

## P46.25 — Recovery schedule across cycles

- Actual debt is grouped by source + expense category, then divided over `recovery_cycle_count` approved earlier.
- Halala-level remainder is distributed deterministically so schedule totals equal the exact principal + growth debt.
- Only one installment for the same source can be paid in one financial cycle.
- Installments must be paid in order; later installments cannot skip an earlier unpaid installment.
- A case closes only after no planned recovery-schedule rows remain.
- Legacy RECOVERY cases without a schedule can build one from their already-recorded actual usage.
- Planned/manual legacy recovery no longer reduces the displayed actual outstanding debt; only PAID repayments do.

## Accounting invariant

`Internal recovery transfer != income != expense`.

The source debt is reduced only by a PAID recovery linked to the recovery schedule. No amount can be paid twice for the same schedule row.
