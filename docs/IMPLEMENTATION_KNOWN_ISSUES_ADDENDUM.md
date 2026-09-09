# Implementation Known Issues Addendum

## ISSUE-0019 — Specialized protected-fund transfer ledger mapping

- **Type:** DATA_INTEGRITY
- **Priority:** P1
- **Status:** RESOLVED
- **Resolved:** P59 / V1.0.0

### Resolution
The final V1 contract follows each command input exactly:

- `SAVING_TRANSFER`: two account ledger legs (`OUT` source / `IN` destination).
- `EMERGENCY_CONTRIBUTION` and `EMERGENCY_WITHDRAWAL`: explicit protected-fund movements with account legs.
- `GOAL_CONTRIBUTION`: the API exposes one `account_id`; it is the source account. The posted contribution is therefore an `OUT` account ledger effect while the goal balance is increased from the same posted contribution record.

Migration `20260904_065_goal_contribution_account_ledger.sql` backfills historical goal-contribution direction, enforces `OUT`, and adds `GOAL_CONTRIBUTION` to authoritative account outflow.

No second destination account is invented for goals because the approved API contract does not define one.

---

# P56 Financial Decision Closure — 2026-09-04

The following source decisions are resolved for V1 by `docs/P56_FINANCIAL_DECISIONS.md`:

- ISSUE-0001 / PENDING-BR-001 — Financial Health Score: **RESOLVED**.
- ISSUE-0002 / PENDING-BR-002 — Required Financial Buffer: **RESOLVED** via explicit owner-selected policy; no hidden default.
- ISSUE-0003 / PENDING-BR-003 — Budget AT_RISK: **RESOLVED** via exact linear-cycle pace.
- ISSUE-0004 / PENDING-BR-004 — Forecast: **RESOLVED** via deterministic current-cycle pace; historical facts have zero hidden weighting in V1.
- ISSUE-0005 / PENDING-BR-005 — Multiple goals: **RESOLVED** as suggestion-only ranking; no automatic cross-goal allocation.
- ISSUE-0006 / PENDING-BR-006 — Emergency target: **RESOLVED** as owner-defined target with informational coverage months.

These decisions do not authorize silent modification of closed snapshots.
