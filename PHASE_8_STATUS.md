# Phase 8 — Expected Income

Status: IMPLEMENTED LOCALLY

## Delivered
- Create expected income.
- List expected incomes by cycle.
- Update command with cycle locking guard.
- Primary income source flag.
- Expected income remains planning-only and does not create a financial transaction.
- Ownership is enforced through authenticated user_id in every repository operation.
- Editing is blocked once a cycle is CLOSING or CLOSED.
- UI integrated under each financial cycle.

## Important boundary
ExpectedIncome is not Actual Income. No liquidity, account balance, Safe To Spend, or transaction ledger is changed in Phase 8. Actual income will be implemented in Phase 11 using POSTED INCOME transactions.

## Known database decision
The current approved database migration supports `is_primary`, but does not enforce a database-level one-primary-per-cycle partial unique index because DATABASE_SCHEMA.md leaves that physical constraint conditional. Application behavior demotes the previous primary source when a new primary is selected. This should be revisited before production concurrency hardening.
