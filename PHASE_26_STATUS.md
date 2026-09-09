# Phase 26 — Reports

Status: IMPLEMENTED
Version: 0.26.0

Implemented:
- Current Cycle Review from live operational data.
- Closed Cycle Report from CycleSnapshot + CycleCategorySnapshot + CycleReview only.
- Historical Comparison from CLOSED cycles only.
- 3/6 closed-cycle windows without pretending a full window exists when data is insufficient.
- Expected vs Actual income, Planned vs Actual expense/saving, unplanned spending when available, category variance, goal contributions, emergency contributions, advisor summary.
- Closed-cycle surplus/deficit read only from immutable snapshot.
- Live-cycle final surplus/deficit deliberately withheld until official closing.
- User ownership enforced on all report queries.

Invariants:
- CLOSED history is never recomputed from current operational tables.
- Historical comparison excludes non-CLOSED cycles.
- Actual and Projected values are not mixed.
- No N+1 query per category/cycle.
