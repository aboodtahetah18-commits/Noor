# Phase 22 — Recommendation Rule Engine

Status: IMPLEMENTED
Version: 0.22.0

## Implemented
- Deterministic rule engine that runs before AI.
- V1 rules: OBLIGATION_OVERDUE, OBLIGATION_UPCOMING, GOAL_UNREALISTIC, SURPLUS_AVAILABLE, OVER_BUDGET.
- DEFICIT_RISK remains blocked by ISSUE-0004 until Forecast is approved.
- SAFE_TO_SPEND_ZERO remains blocked by ISSUE-0002 until Required Financial Buffer is approved.
- No AT_RISK formula is invented (PENDING-BR-003).
- Every recommendation stores reason_code, reason_data, type, priority, status, and a stable deduplication key.
- Repeated dashboard reads reconcile rules before reading the top recommendation and do not create duplicate open warnings.
- Open recommendations are resolved when their underlying deterministic condition disappears.
- Lifecycle transitions NEW / VIEWED / ACCEPTED / DISMISSED / EXPIRED / RESOLVED use the central state-machine engine and StateTransitionLog.
- Surplus arithmetic uses the Money value object, not JavaScript floating-point arithmetic.
- V1 priority remains neutral at 1 because no relative recommendation ranking policy has been approved.

## Deferred
- Advisor Feed and details UI: Phase 23.
- AI explanation/wording: Phase 24.
