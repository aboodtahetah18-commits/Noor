# Release v0.46.19 — Trip Funding Readiness

## Added
- P46.18 trip funding reservation inside a parent financial goal.
- P46.19 per-cycle funding requirement until the trip start date.
- Protection against assigning the same goal funding balance to multiple active/planned trips.
- Read model showing trip target, this-trip reservation, other-trip reservations, unassigned goal balance, funding gap, remaining cycles, and required per cycle.

## Financial safety
- Funding reservation is organizational only; it does not create a bank transfer or financial transaction.
- Unassigned goal funding is never silently assigned to a trip.
- Missing trip budget/date produces an explicit incomplete state instead of an invented estimate.

## Database
- Added migration 057: goal_event_funding_reservations.
- Total migrations: 57.

## Verification
- verify-p46-19: PASS.
- verify-phase41: PASS.
- verify-phase42: PASS.
- Full TypeScript build could not be certified in this runtime because project dependencies are not installed; no build success is claimed.
