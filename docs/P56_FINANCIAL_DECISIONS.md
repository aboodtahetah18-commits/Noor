# P56 — Final Financial Decisions (V1)

This document closes PENDING-BR-001 through PENDING-BR-006 for V1 without hidden automatic financial behavior.

## PENDING-BR-001 — Financial Health Score
**Decision:** Equal average of all available, applicable dimensions. No hidden weights. Missing/not-applicable dimensions are omitted rather than scored as zero.

Available V1 dimensions:
- deficit safety,
- budget adherence,
- saving adherence,
- emergency readiness,
- obligation discipline,
- unplanned-spending control,
- goal feasibility.

Status bands use the four equal quarters of the 0–100 scale:
- 75–100 EXCELLENT
- 50–74 GOOD
- 25–49 WARNING
- 0–24 CRITICAL

Every result carries a dimension breakdown and reason text.

## PENDING-BR-002 — Required Financial Buffer
**Decision:** V1 imposes no secret/default buffer. The owner must explicitly choose an active policy:
- FIXED
- PERCENT_INCOME
- MAX_FIXED_PERCENT

Safe To Spend remains unavailable until a policy is configured. The settings form no longer pre-fills 1,000 SAR / 10% as if those were approved financial defaults.

## PENDING-BR-003 — Budget AT_RISK
**Decision:**
- `OVER_BUDGET` when Actual > Budget.
- Otherwise `AT_RISK` when actual spend is ahead of the exact linear plan pace for elapsed cycle time.
- Otherwise `NORMAL`.

Formula without floating point:
`actual * cycleDays > budget * daysElapsed`.

There is no arbitrary 80% threshold.

## PENDING-BR-004 — Forecast Algorithm
**Decision:** V1 is deterministic current-cycle pace:
- observed daily pace = actual spending / elapsed days,
- projected future pace spend = observed daily pace × remaining days,
- projected end balance = current liquidity - upcoming obligations - expected remaining essentials - projected pace spend,
- expected deficit = max(-projected end balance, 0) for the pure forecast contract.

The live cash forecast additionally protects explicit savings/emergency/goal allocations and the owner-selected financial buffer when determining protection deficit and Safe To Spend.

Historical facts may be shown for context but carry **zero hidden weighting** in the V1 forecast.

## PENDING-BR-005 — Multiple Goal Allocation
**Decision:** V1 does **not** automatically redistribute money among goals.

For suggestions only, goals are ranked by:
1. explicit owner priority,
2. nearest target date,
3. stable ID tie-break.

Any actual allocation still requires an explicit user decision/application command.

## PENDING-BR-006 — Emergency Fund Target
**Decision:** V1 does not impose an arbitrary 3/6/12-month target. `target_amount` remains owner-defined.

Coverage months is informational only:
`current emergency balance / monthly essential baseline`.

The current active approved-plan ESSENTIAL allocation is the V1 baseline. If no positive essential baseline exists, coverage months is unavailable rather than fabricated.

## Historical integrity
These V1 decisions apply prospectively. Closed historical snapshots are not silently recalculated.

## Database impact
No schema migration is required for P56. The existing financial buffer policy table remains authoritative for the explicit buffer choice. Migration inventory remains 64.
