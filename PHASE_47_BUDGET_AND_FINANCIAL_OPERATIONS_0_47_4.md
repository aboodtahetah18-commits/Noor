# P47.3 + P47.4 — Budget & Financial Operations Experience

## P47.3 — Budget
- Rebuilt the budget page around planned / actual / remaining values.
- Added total allocation hero and utilization progress.
- Added allocation-group summary cards.
- Added category-level progress with only deterministic states: NORMAL or OVER_BUDGET.
- No arbitrary AT_RISK threshold was introduced.
- Draft/revision approval remains on canonical existing workflows.
- Mobile uses cards/progress instead of forcing the desktop layout.

## P47.4 — Financial operations
- Rebuilt the financial ledger as a readable transaction feed with compact filters and cycle KPIs.
- Bank message capture remains the primary daily action.
- Rebuilt the bank operations center with a visible journey, decision inbox, message-entry surface, and latest approved activity.
- Manual expense, transfer, and refund remain secondary/exceptional actions.
- No financial calculation or transaction semantics changed.

## Database
No migration required. Migration count remains 64.
