# Phase 23 — Advisor Feed & Recommendation Details

Status: IMPLEMENTED
Version: 0.23.0

## Implemented
- API-Q-060 style Advisor Feed with optional status/type/priority filters and pagination.
- Deterministic supporting_summary derived from reason_data; no AI dependency.
- Recommendation details with reason_code, reason_data interpretation, related entity, and suggested actions.
- NEW recommendations become VIEWED when their details are opened.
- Accept supports NEW / VIEWED → ACCEPTED and returns/navigates to next_action only; it never executes the financial action.
- Dismiss supports NEW / VIEWED → DISMISSED.
- Existing StateTransitionLog audit remains authoritative for lifecycle changes.
- Dashboard now links to the Advisor feed and recommendation details.
- Mobile/RTL Advisor layouts added.

## Safety boundary
- Suggested actions are navigation intents only (plan revision, goal review, saving transfer, obligations).
- AI is not used to calculate, rank, accept, dismiss, or execute recommendations.
- Relative recommendation priority remains unchanged because no ranking policy has been approved.

## Deferred
- AI explanation and personalized wording: Phase 24.
