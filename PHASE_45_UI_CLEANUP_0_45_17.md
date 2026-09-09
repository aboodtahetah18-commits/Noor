# P45.17 — UI Cleanup and Legacy Path Consolidation

- Bank messages are the primary daily capture path on desktop, tablet, mobile, dashboard, workspace, and financial ledger.
- `/expenses` remains available only as an exceptional manual fallback.
- `/transactions` is presented consistently as the final financial ledger, not a second intake center.
- Removed stale ISSUE-0002 UI text because the active financial buffer policy is already implemented.
- Removed stale visible phase labeling from the daily bank operations page.
- No financial calculation or posting rules were changed in this UI cleanup.
