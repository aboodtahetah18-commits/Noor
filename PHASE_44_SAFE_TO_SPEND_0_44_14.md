# P44.14 — Required Financial Buffer + Safe To Spend

- Adds an explicit user-controlled financial buffer policy.
- Supported modes: fixed amount, percentage of cycle income, or the greater of fixed/percentage.
- Final closing Safe To Spend = actual liquidity - reserved unpaid obligations - required financial buffer.
- Negative results display as zero and preserve protection deficit metadata.
- Cycle rollover is blocked until an active buffer policy exists.
- Cycle snapshots persist the finalized Safe To Spend and the exact policy metadata used.
- Historical NULL Safe To Spend snapshots are rendered as BLOCKED rather than parsed as money.
