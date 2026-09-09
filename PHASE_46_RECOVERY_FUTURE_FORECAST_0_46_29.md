# P46.28 + P46.29 — Recovery future forecast

- Projects unpaid internal-funding recovery installments across the current and future financial-cycle cadence before those future cycles are created.
- Projection is read-only: it creates no financial cycle, transfer, repayment, reservation, or budget revision.
- Per source, the first unpaid installment remains the current/overdue obligation; later installments are projected one cycle at a time so a source is never shown as paying two installments in one cycle.
- Future cycle dates are anchored to the active cycle's expected next income date and calendar-month cadence, consistent with cycle rollover behavior.
- The UI separates principal, 10% growth, and total recovery burden per projected cycle.
- Capacity impact uses current expected income only as an explicitly labeled reference assumption. It shows expected income minus recovery burden only, before obligations and all other allocations; it is not a full future budget forecast.
- No risk threshold or automatic financial decision is introduced.
