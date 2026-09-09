# P49.12 — Mobile Ledger Compact Header

- Removed the ledger help disclosure from the financial movement header.
- Moved bank-message and operations actions into the same horizontal row as the ledger title.
- Shortened the actions to icon + compact labels: `بنكية` and `العمليات`.
- Preserved the matching-status line as a quiet secondary row.
- Added dedicated bank-message and operations SVG icons.
- Added mobile-specific sizing to reduce vertical space without reducing tap clarity.
- No database or financial-rule changes. Migration count remains 64.
