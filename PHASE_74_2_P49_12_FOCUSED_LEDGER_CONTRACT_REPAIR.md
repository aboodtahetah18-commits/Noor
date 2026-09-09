# P74.2 — P49.12 Focused Ledger Contract Repair

## Root cause
P74 intentionally simplified the financial ledger page so it focuses only on the ledger. The legacy P49.12 quality gate still required bank-message and bank-operations action controls inside the ledger header. Those controls were deliberately removed by the approved focused-page architecture.

## Repair
- Updated P49.12 to validate the compact ledger title row without requiring unrelated bank actions.
- Added explicit assertions that bank-message and bank-operations actions are absent from the focused ledger header/page.
- Retained compact status, mobile sizing, and icon-system checks.
- No help/explanation UI restored.
- No financial logic, database schema, auth, or routes changed.
