# Personal Finance Advisor — v0.46.11

Base: v0.45.19 Netlify Cycle Type Fix

## Consolidated additions

- Alert center based on actual source states with explicit Seen / In Progress / Snoozed lifecycle and history.
- Contextual overspending reason → explicit financial-goal linkage.
- Goal → multiple trips/events → bank rows/transactions → expense categories.
- Bank message first-capture reconciliation: a later statement match is enrichment/evidence, not a second financial effect.
- Trip date range proposes candidate expenses only; user confirmation is required for trip linkage.
- Closed-trip historical cost reference by destination: average, minimum, maximum, and category averages.
- Exceptional trips can be excluded from planning benchmarks without deleting their historical transactions.
- Historical trip values never silently overwrite a future trip budget.

## Database

Migrations: 53 total.
New: 050, 051, 052, 053.

## Verification

- Phase 41 structural verification: PASS
- Phase 42 compatibility verification: PASS
- P45.9 decision audit verification: PASS
- P46 consolidated presence verification: PASS
- Focused TypeScript scan: no P46-specific semantic/type errors detected after excluding dependency-resolution/JSX-runtime errors caused by the source ZIP not containing node_modules.

A full Next.js build was not executed in this sandbox because the supplied source ZIP does not include installed dependencies or a package-lock usable by npm ci.
