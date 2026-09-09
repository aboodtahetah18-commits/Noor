# P44.26 — Contextual Historical Learning

- Historical learning uses CLOSED-cycle snapshots only.
- ±10% against the planned category amount is the review/explanation trigger.
- 3-cycle and 6-cycle averages are displayed only when enough closed cycles exist.
- Historical averages are references, not automatic next-plan amounts.
- No arbitrary rounding is applied.
- Context can classify a variance as temporary, recurring, or permanent and attach a named season.
- Forecast accuracy displays both SAR error and a percentage when the actual balance is non-zero.
- No read/query path writes learning data.
