# Release 0.46.13

## P46.12 — Next Trip Plan from Historical Reference
- User-triggered historical seeding by destination city.
- Category-level trip plan with retained reference values and benchmark trip count.
- Manual edits override the seeded planned amount and are explicitly stored as MANUAL.
- No automatic mutation of trip budgets from history.

## P46.13 — Live Trip Progress
- Explicit trip start action.
- Actual linked spend vs approved trip/category plan.
- Deterministic difference and utilization; no invented financial warning threshold.
- Over-plan categories request an explanatory reason which is stored for future learning.
- Closed trips remain immutable through normal planning commands.

## Database
- Migration 054: goal_event_category_plans.
- Total migrations: 54.
