# Release 0.46.27 — Recovery obligations in cycle planning

## Added
- P46.26: automatic recovery installment reservation in active-cycle planning.
- P46.27: recovery impact on available financial capacity before optional goals and flexible spending.
- Separate principal/growth display for each recovery obligation.
- Overdue recovery carry-forward without silently advancing to a later installment.
- Recovery reservation metadata (`due_cycle_id`, `due_assigned_at`).

## Financial integrity
- Reservation does not create a repayment or transfer.
- Only an explicit internal transfer marks recovery as paid.
- A source already paid in the active cycle is not charged a second installment in that same cycle.
- Final plan snapshot records recovery demand and breakdown.

## Database
- Migration 060: `20260904_060_recovery_cycle_reservations.sql`.
- Total migrations: 60.

## Verification
- P46.26/P46.27 structural verification: PASS.
- Phase 41 structural verification: PASS.
- Phase 42 compatibility verification: PASS.
- Full TypeScript build not executed because project dependencies are not installed in the execution environment.
