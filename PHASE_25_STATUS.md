# Phase 25 — Forecast Engine V1

Status: IMPLEMENTED AS CONTRACT / BLOCKED FORMULA
Version: 0.25.0

## Source-of-truth constraint

`PENDING-BR-004` / `ISSUE-0004` is still open. The system knows the required forecast fact families but does not have an approved mathematical rule for combining them.

Therefore Phase 25 deliberately does **not** return a production forecast number.

## Implemented

- `ForecastEngine` interface isolated from Dashboard/UI.
- `ForecastInput` structured-facts contract.
- Inputs include at least:
  - actual spending,
  - days elapsed,
  - remaining days,
  - upcoming obligations,
  - expected essential spending,
  - optional historical patterns,
  - current liquidity as an additional factual input.
- Input validation including zero-remaining-days edge case.
- `PendingForecastEngine` production-safe implementation.
- Explicit blocked result:
  - `projectedEndBalance = null`
  - `expectedDeficit = null`
  - `blockingIssue = ISSUE-0004`
  - `pendingRule = PENDING-BR-004`
- Dashboard now consumes `ForecastEngine` rather than hard-coding its own blocked forecast state.
- Contract tests ensure historical data cannot silently activate an unapproved weighting model.

## Explicitly not implemented

No extrapolation, spend-rate projection, historical average weighting, obligation weighting, expected-expense weighting, linear forecast, moving average, or other mathematical forecast model is adopted.

## Future activation

Once `PENDING-BR-004` is approved, implement a versioned engine behind the existing interface (for example `ForecastEngineV1`) and preserve the contract so Dashboard and Reports do not need redesign.
