# P74 — Focused Page Architecture & Sequential Journeys

## Why this phase is structural
P71–P73 improved consistency, visual hierarchy, dashboard clarity, and daily entry ergonomics. P74 changes the information architecture itself: each operational page is assigned one primary job, unrelated dashboard-style metrics are removed or demoted, and related pages are connected as an explicit sequential journey.

## Core rule
One page = one financial job.

Secondary history/explanation is hidden behind progressive disclosure when it is useful but not part of the immediate task.

## Major changes
- Bank Operations now focuses only on unresolved bank-message review. Removed the four unrelated KPI boxes and the recent-approved duplicate ledger section.
- Bank Statements now focuses only on statement upload, import history, and reconciliation. Removed intelligence quality dashboard, merchant-governance editor, and duplicate bank-message form from this page.
- Accounts now focuses on active money locations and total liquidity. Replaced the four-card KPI dashboard with one liquidity summary and collapsed inactive accounts.
- Transactions now focuses on the ledger itself. Removed the four financial KPI cards and top cross-navigation actions.
- Obligations now surfaces one priority state instead of four parallel summary cards.
- Savings and Emergency now use compact execution metrics instead of four-card dashboards; explanatory material is secondary disclosure.
- Income now shows one actual-vs-expected summary rather than a dashboard of parallel boxes.
- Goals now shows one funding focus summary instead of four command KPI cards.
- Advisor now shows one decision-focused summary rather than four historical/statistical boxes.
- Alerts history is secondary disclosure; current alerts remain the main job.
- Added a shared sequential "التالي" navigation pattern between related financial stages.

## Sequential journey
Accounts → Bank Operations → Bank Statements → Transactions → Budget → Obligations → Savings → Emergency → Goals → Advisor → Reports

This is guidance, not a forced wizard. All pages remain independently reachable from navigation.

## Safety
No financial formula, database schema, authentication flow, route set, or transaction semantics were changed.

## Verification
- Route integrity: PASS — 67 pages
- Protected route closure: PASS — 63 pages
- P49.13 responsive/mobile contract: PASS
- P55 header/profile contract: PASS
- P64 final closure contract: PASS
- CSS brace balance: PASS
