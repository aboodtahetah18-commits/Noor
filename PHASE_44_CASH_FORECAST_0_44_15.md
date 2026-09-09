# P44.15 — Cash Forecast & Pre-Payday Plan

- Deterministic cash forecast through the next expected income date.
- Uses current liquidity, upcoming obligations, active financial buffer, and observed variable-spend pace.
- Calculates protected safe-to-spend until payday and a suggested daily ceiling.
- Flags buffer risk/deficit.
- Can suggest an internal transfer when an obligation-linked account is underfunded and another owned account can cover the shortfall.
- Suggestions never execute automatically.
- Migration 039 adds forecast snapshot storage for future historical calibration.
