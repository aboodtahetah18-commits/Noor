# P44.25 — System hardening and reconciliation

This stage is a correctness hardening pass before the major financial-intelligence part can be closed.

## Fixed
- Monthly review draft and approval are now separate actions. Saving a draft no longer marks the review as REVIEWED.
- Saved review recommendations are restored on revisit.
- Category deviation review now uses the user-approved ±10% attention boundary and does not auto-increase/decrease budgets.
- Bank reconciliation readiness and recurring-candidate counts are scoped to the reviewed cycle window.
- Forecast reservation includes unpaid overdue obligations even when their due date is before today.
- Forecast variable spend excludes obligation-linked transactions and is limited to FLEXIBLE plan categories to reduce double counting.
- Removed the undocumented 125% buffer WATCH threshold; forecast risk is now RISK only when the protection deficit is positive, otherwise HEALTHY until a WATCH business rule is approved.
- Per-account internal transfer advice is withheld until account-level reserve rules are explicit.
- Removed the misleading direct cycle "complete closing" UI route. Authoritative close path is review -> approved review -> rollover close with snapshot.
- EVERY_N_CYCLES recurrence now uses monthly cycle ordinals rather than day-count approximations.
- SEASONAL recurrence no longer auto-passes without explicit season configuration.

## Verification
- Phase 41 structural verification passes.
- Phase 42 compatibility verification passes.
- Full Next.js build/typecheck is not claimed because dependencies/node_modules are not present in this working copy.

## Remaining before major-part completion
- Historical contextual learning promised in P44.17 is not present in the current integrated source and must be rebuilt/integrated before release.
- Adaptive daily guidance P44.16 is not present in the current integrated source and must be reconciled with the hardened forecast.
- Forecast algorithm remains provisional until the formal business-rule decision is documented.
