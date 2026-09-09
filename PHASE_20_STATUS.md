# Phase 20 — Financial Goals

Status: IMPLEMENTED WITH EXPLICIT REFERENCE BOUNDARY
Version: 0.20.0

Implemented:
- API-Q-050 list goals.
- API-Q-051 deterministic goal analysis.
- API-C-050 create goal with DRAFT initial state and idempotency.
- API-C-051 activate goal.
- API-C-052 record GOAL_CONTRIBUTION and update goal progress.
- API-C-053 pause.
- API-C-054 resume with feasibility re-evaluation.
- API-C-055 cancel with historical preservation.
- Automatic ACHIEVED when current balance >= target.
- FINANCIALLY_UNREALISTIC when an individual required contribution exceeds currently known aggregate goal capacity.
- No cross-goal automatic distribution (PENDING-BR-005 / ISSUE-0005).

Reference boundary:
- The current references define GOAL_CONTRIBUTION as increasing goal balance but do not finalize a two-account physical cash-transfer model for goal contributions (implementation issue ISSUE-0019). Therefore Phase 20 records the posted goal contribution against the selected account for goal-ledger/history purposes but intentionally does NOT modify account_balances_v or invent a destination ledger leg. The result exposes cashLedgerEffect=NOT_DEFINED_BY_CURRENT_REFERENCE_MODEL.
- Cancellation preserves history and does not automatically move an existing goal balance because STATE_MACHINES leaves that handling as a separate future decision.

Goal calculations:
- Remaining = MAX(Target - Current, 0)
- Progress = min(Current / Target * 100, 100)
- Remaining financial cycles use the cadence of the active financial cycle (start_date -> expected_next_income_date) when available.
- Required contribution = Remaining / Remaining Financial Cycles.
- Feasibility can only mark a goal definitely unrealistic when its individual required contribution exceeds the aggregate goal capacity known from the active plan. No constrained cross-goal allocation is performed.
