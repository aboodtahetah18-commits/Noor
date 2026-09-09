# P44.21 — Goal cycle funding + recovery readiness

## Scope
- Treat dated goals as explicit per-cycle funding needs.
- User approves the amount for each goal every cycle; no automatic transfer or cross-goal allocation.
- Persist approved per-cycle goal commitments separately from actual GOAL_CONTRIBUTION transactions.
- Surface repayment ability for debtor categories using current-plan headroom (planned minus posted spend).
- Keep internal funding recovery user-approved; emergency source remains higher repayment priority than investment.

## Financial safety
- A commitment is planning data only; it does not post a transaction.
- A repayment proposal is not an automatic debit.
- The UI exposes required amount, approved amount, and gap so an underfunded goal is visible before its due date.
- No arbitrary rounding is applied to goal needs.

## Database
Migration `20260903_041_goal_cycle_commitments.sql` adds `goal_cycle_commitments`.
