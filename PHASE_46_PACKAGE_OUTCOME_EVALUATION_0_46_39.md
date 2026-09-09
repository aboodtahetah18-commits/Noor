# P46.38 + P46.39 — Package Outcome Evaluation

## Scope
This phase evaluates completed composite pressure-decision packages against the financial pressure that actually exists after execution.

## P46.38 — Recalculate after execution
- Evaluation is allowed only after the package is `COMPLETED`.
- The forecast is recalculated from current approved/posted data.
- New packages persist the target cycle window (`target_window_start`, `target_window_end`) so outcome evaluation can locate the same financial window without relying only on a relative cycle index.
- Actual committed deficit and actual trip deadline gap are stored.
- Deferred-trip gaps are tracked separately as shifted pressure, not treated as a financial saving.

## P46.39 — Expected vs actual
Stored package expectations are compared with actual post-execution values:
- expected committed deficit after package vs actual committed deficit;
- expected trip gap at original deadline vs actual trip gap;
- expected timing shift vs actual remaining gap on deferred trips.

Outcome classes:
- `RESOLVED`
- `REDUCED`
- `SHIFTED`
- `UNCHANGED`
- `WORSENED`
- `MIXED`

No arbitrary percentage or tolerance threshold is used. Currency values are compared after two-decimal normalization only.

## Governance
- Outcome evaluation is read/analysis only; it does not write financial transactions, move money, or change a plan.
- A shifted trip is explicitly identified as shifted pressure, not a solved funding gap.
- Evaluation evidence is snapshotted for later decision-learning phases.

## Database
Migration 063 adds target-window provenance and package outcome fields, plus `OUTCOME_EVALUATED` audit events.
