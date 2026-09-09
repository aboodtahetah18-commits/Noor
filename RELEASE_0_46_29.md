# Release 0.46.29

## P46.28 — Future recovery schedule projection
- Projects the current and later unpaid recovery installments across financial-cycle cadence before those future cycles are created.
- Keeps overdue/current installments first and never skips the unpaid installment order for a source.
- Separates emergency and investment sources as well as principal and growth.

## P46.29 — Future capacity impact
- Shows the recovery burden for each projected cycle.
- When current expected income exists, uses it only as a labeled reference assumption and displays expected income minus recovery burden before all other obligations and allocations.
- This is not a full future budget forecast and makes no automatic financial change.

## Database
- No schema migration required.
- Migration count remains 60.

## Version
- 0.46.29
