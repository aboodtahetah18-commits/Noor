# P44.3 — Approval & Reconciliation

- Final approval creates posted ledger transactions only after review is complete.
- Duplicate candidates linked to existing transactions are ignored, not duplicated.
- Internal transfers create a transfer ledger plus OUT/IN transaction pair.
- Expenses/fees require a category; transfers require a counter-account; refunds require an original expense.
- Bank-statement row idempotency prevents duplicate posting on repeated approval.
- Optional bank closing balance is reconciled against `account_balances_v` and stored as MATCHED/DIFFERENCE/NOT_PROVIDED.
