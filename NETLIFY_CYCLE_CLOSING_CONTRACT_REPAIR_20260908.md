# Netlify Cycle Closing Contract Repair — 2026-09-08

## Authority
- `OVR-007 — Quality Gate Relevance`
- `QG-004 — Tests`
- `QG-015 — Regression`
- `QG-016 — Financial Correctness`
- `QG-020 — Functional Closure`
- `CHG-QG-0001`

## Symptom
Netlify quality gate failed in two tests because they required the literal historical marker `P56_FINANCIAL_FINALIZATION` to exist in the cycle rollover service source.

## Root Cause
The product requirement is to calculate the finalized financial-health score and persist it in the immutable cycle snapshot. The service already performs that behavior. The failing assertions were stale source-shape/phase-marker checks rather than functional contract checks.

## Repair
Updated:
- `tests/integration/cycle-closing-contract.test.ts`
- `tests/regression/p57-complete-product-journey-contract.test.ts`

The contracts now require all of the following evidence in the rollover service:
- `calculateFinancialHealth`
- `financial_health_score`
- `source:'FINALIZED_FINANCIAL_SNAPSHOT'`

No historical P56 marker was reintroduced into production code.

## Verification
Static contract verification against `src/features/cycles/services/cycle-rollover-service.ts`: PASS.
Full Vitest/Netlify execution: NOT VERIFIED in the local sandbox because project dependencies are not installed.
