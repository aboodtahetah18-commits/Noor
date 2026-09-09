# Phase 27 — Cycle Closing

## Implemented
- API-C-080 start closing: ACTIVE → CLOSING with ownership, optimistic state guard, and audit log.
- API-C-081 application boundary through CycleClosingService.
- Central state machine transition validation.
- UI actions on the cycle details screen.
- Contract tests for allowed/forbidden transitions and unresolved final Safe To Spend.

## Deliberate business-rule blocker
The approved database snapshot contract requires `safe_to_spend_final`, but its calculation depends on `Required Financial Buffer`, whose formula is still `PENDING-BR-002 / ISSUE-0002`.

The implementation therefore **does not write a fake 0** and **does not mark the cycle CLOSED**. A cycle may enter CLOSING, but completion returns `BLOCKED_PENDING_BUSINESS_RULE` until the rule is approved.

This preserves the Phase 27 atomicity invariant: no partial snapshot and no partially CLOSED cycle.

## Next activation point
When PENDING-BR-002 is approved, add the deterministic final-metrics calculator inside CycleClosingService and perform, in one DB transaction:
1. Lock cycle.
2. Validate transactions.
3. Calculate final metrics.
4. Create CycleSnapshot.
5. Create CycleCategorySnapshots.
6. Create CycleReview.
7. Close Financial Plan.
8. Close Financial Cycle.
9. Write StateTransitionLogs.
