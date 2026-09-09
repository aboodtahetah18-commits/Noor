# P49.13 — Global Mobile Compact UX

## Goal
Apply the approved compact mobile interaction language across the protected product surface before P50 acceptance.

## Implemented
- Rebuilt the mobile top bar with a compact logo/profile trigger, a bright white product title, and icon-only notifications/settings actions.
- Normalized the bottom navigation into five equal, correctly linked icon + label tabs.
- Added a reusable collapsible filter panel.
- Converted the transaction ledger filters into a compact mobile layout: type/account/category share one row, date range shares the next row, with search and sort retained inside the disclosure.
- Converted advisor filters into a compact three-field row with apply/clear on a second row.
- Applied shared two-column mobile form density to protected forms, preserving textarea/full-width sections.
- Kept action groups horizontal with overflow rather than vertically stacking every action.
- Reduced page-header, card, KPI, and module spacing to cut scroll depth while preserving touch targets.
- Kept the P49.11 navy/cyan visual identity and modal-first architecture.

## Scope
The shared responsive contract covers all protected page routes. Route-specific layouts may add stricter rules, but may not revert to one-control-per-row as the default mobile pattern.

## Data / database
No schema or migration change. Migration inventory remains 64.
