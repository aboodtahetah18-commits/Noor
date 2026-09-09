# P46.34 + P46.35 — Composite Pressure Decision Packages

## Scope
- Build a compound scenario from two or more currently available pressure-decision actions.
- Calculate the package effect on committed deficit and current-deadline trip gaps without double counting.
- Preserve timing shifts separately from true financial relief.
- Persist a DRAFT package with immutable scenario snapshots.
- Revalidate all selected scenario amounts and the target pressure cycle before approval.
- APPROVED means the items are READY for their canonical execution paths; approval itself performs no financial transaction and silently changes no plan, goal, reservation, or trip date.

## Safety rules
- User choice remains authoritative.
- A package cannot include both reserving funds for a trip and deferring that same trip.
- Flexible headroom is only used where the source scenario itself is valid (current-cycle evidence).
- Goal-contribution relief is capped at the actual committed deficit.
- Trip relief is recomputed across selected actions; timing-shifted gap is reported separately.
- Stale packages cannot be approved after the forecast/scenario values change.

## Persistence
Migration 061 adds:
- `financial_pressure_decision_packages`
- `financial_pressure_decision_package_items`
- `financial_pressure_decision_package_events`

States:
`DRAFT -> APPROVED -> IN_PROGRESS -> COMPLETED`, with `CANCELLED` available before execution completion.

This phase implements creation and approval readiness. Canonical execution remains in the existing specialized workflows, so a compound decision never becomes an artificial single financial transaction.
