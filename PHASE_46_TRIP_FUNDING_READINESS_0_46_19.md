# P46.18 + P46.19 — Trip funding readiness

- Each trip keeps an explicit user-approved reservation from the parent goal funding pool.
- The same goal balance cannot be reserved simultaneously for multiple active/planned trips.
- Funding readiness shows: trip target, reserved for this trip, reserved for other trips, unassigned goal funding, trip funding gap, cycles remaining, and required contribution per remaining cycle.
- Per-cycle requirement is derived from the remaining gap after the trip's explicit reservation; unassigned goal balance is shown separately and is not silently assigned.
- No bank transfer, goal contribution, budget change, or financial transaction is created by reserving funding.
- If trip budget or date is missing, the system reports missing inputs instead of inventing a financial estimate.
- Closed trips cannot receive new reservations.
