# P75 — Deep Page Simplification

## Objective
Turn dense operational pages into focused, sequential work areas instead of showing every related panel at the same time.

## Changes
- Shared workflow stage component now renders stage labels only; explanatory helper copy is not shown.
- Shared next-step component no longer renders descriptive helper text.
- Bank statement detail focuses first on unresolved decisions, then approval/reconciliation; the full analyzed ledger is secondary disclosure.
- Cycle review gates later work until bank readiness is complete; close action appears only after review approval.
- Budget optimizer shows deficit work or surplus routing based on the actual current state, not both at once.
- Internal funding keeps active funding cases primary while create/debt/forecast sections are progressive disclosures; recovery work opens when relevant.
- Goal detail collapses trip-funding timeline and the complete trip workspace until requested; a selected trip opens its workspace automatically.
- Future pressure keeps the current decision scenarios primary and moves packages, historical learning, and governance/limits to secondary disclosures.

## Scope protection
No financial formula, database schema, authentication flow, route set, or mutation semantics were changed.
