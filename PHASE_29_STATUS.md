# Phase 29 — Weekly Analysis Job

Status: IMPLEMENTED
Version: 0.29.0

## Implemented
- Weekly background analysis boundary.
- Riyadh-local Monday period key.
- Database-backed idempotent run reservation.
- Safe retry for FAILED runs; SUCCESS/PARTIAL/RUNNING reuse the same run.
- Obligation status synchronization before analysis.
- Deterministic Recommendation Rule Engine execution.
- Dashboard read-model recalculation/read after rules.
- Summary persisted as structured JSON only.
- Protected scheduler endpoint using JOB_SECRET.
- No dependency on an interactive user session.
- Background failure logs avoid financial payloads.

## Idempotency invariant
Re-running the weekly job for the same user/cycle/period does not create another weekly run or duplicate deterministic recommendations.

## Known blocked calculations
Recommendation rules depending on ISSUE-0002 (Safe To Spend buffer) and ISSUE-0004 (Forecast) remain blocked and cause the weekly run to be marked PARTIAL rather than inventing financial values.

## Scheduling
This phase implements the background-job execution endpoint and idempotency boundary. The external scheduler can call POST /api/jobs/weekly-analysis with Bearer JOB_SECRET. Provider scheduling configuration remains deployment infrastructure and must not weaken authentication.
