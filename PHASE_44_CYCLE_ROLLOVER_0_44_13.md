# P44.13 — Cycle Rollover
- Close only after monthly review + bank reconciliation readiness.
- Immutable cycle/category snapshots.
- `safe_to_spend_final` remains NULL while PENDING-BR-002 is unresolved; no fake zero is persisted.
- Next cycle is created as DRAFT and is not activated automatically.
- Next plan is created as PLAN_DRAFT from reviewed recommendations.
- PAUSE recommendations are omitted.
- Recurrence rules are respected during rollover.
