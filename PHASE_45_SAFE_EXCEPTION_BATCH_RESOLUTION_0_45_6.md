# P45.6 — Safe Exception Center / Exact Merchant Batch Resolution

## Goal
Reduce repetitive merchant review without turning one correction into silent financial automation.

## Approved behavior
When the user confirms a merchant and category for one unresolved debit row, the review UI shows how many other unresolved rows have the exact same normalized merchant and their total amount. The user may confirm only the current row or explicitly apply the same merchant/category definition to exact matches.

## Safety boundaries
Batch propagation is restricted to exact normalized merchant + same direction + unresolved rows in REVIEW/READY imports. It excludes duplicate candidates and rows already linked to an internal transfer or funding case. It does not copy funding/trip/goal links, counterpart accounts, matched transactions, or final transaction IDs.

## Financial authority
Batch propagation resolves classification metadata only after explicit user confirmation. It does not POST transactions. Import approval remains the separate authoritative action that creates POSTED transactions.

## Learning principle
Generalize merchant knowledge, not financial context.
