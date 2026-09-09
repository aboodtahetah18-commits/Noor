# Phase 21 — Dashboard Read Model

Status: IMPLEMENTED
Version: 0.21.0

## Implemented
- API-Q-001 backend read model.
- Current operational cycle resolution and optional cycle selection support at repository level.
- Live liquidity from `account_balances_v`.
- Expected vs actual income.
- Planned vs actual vs remaining budget, with linked refunds reducing expense actuals.
- Savings planned/actual/rate.
- Upcoming obligations ordered by urgency.
- Existing top recommendation read-only; Phase 22 remains responsible for generating recommendations.
- Emergency summary and goal summaries.
- Closed-cycle metrics read from immutable `cycle_snapshots`.
- Real authenticated dashboard UI for desktop/mobile.

## Deliberately blocked
- Live Safe To Spend and Daily Safe: `ISSUE-0002` (Required Financial Buffer not approved).
- Live Forecast: `ISSUE-0004` (Forecast formula not approved).
- Recommendation generation: Phase 22.

The frontend displays backend read-model results and does not implement authoritative financial formulas.
