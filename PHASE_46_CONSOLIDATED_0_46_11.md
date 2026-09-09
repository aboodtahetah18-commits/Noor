# P46 consolidated — v0.46.11

Implemented on top of v0.45.19:
- P46.1–P46.3 source-derived alert center with explicit lifecycle actions and history.
- P46.6–P46.7 contextual pattern → explicit financial goal linkage.
- P46.8–P46.9 goal → trips/events → bank rows/transactions → categories.
- Earlier bank-message capture wins over a later statement duplicate; statement data is enrichment/evidence only.
- P46.10–P46.11 closed-trip historical benchmarking per city, with explicit exclusion of exceptional trips from planning references.
- Historical references never silently mutate budgets or new trip planned amounts.
- Fixed stale `budget_allocations.user_id` join in goal capacity query.

Database migrations: 050–053.
