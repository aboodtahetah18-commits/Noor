# Release v0.46.17 — Contextual Trip Variance Learning

## Added
- P46.16: category-level variance learning from closed, benchmark-eligible trips matched by city + trip context.
- Structured user-selected variance reasons with optional notes.
- P46.17: next-trip planning view now shows recurring category overruns and their recorded causes.

## Financial safety
- No new arbitrary financial threshold.
- No automatic increase/decrease of a trip budget or category plan.
- Only closed, benchmark-eligible historical trips feed learning.
- Trip type and variance reasons are explicit user context, not model inference.

## Database
- Migration 056: `variance_reason_code` on `goal_event_category_plans` with constrained values and learning index.
- Total migrations: 56.

## Verification
- P46.16/P46.17 structural verifier: PASS.
- Phase 41 structural verification: PASS.
- Phase 42 compatibility verification: PASS.
- P45.9 audit verification: PASS.
