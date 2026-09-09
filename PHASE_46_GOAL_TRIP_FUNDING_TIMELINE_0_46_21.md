# P46.20 + P46.21 — Goal Trip Funding Timeline

- All planned/active trips inside a goal are evaluated on one chronological funding timeline.
- Existing goal funding is split between explicit trip reservations and unassigned goal funding; the same rial is never treated as available to multiple trips at once.
- The projection uses the current active cycle's explicitly approved goal contribution as the current contribution pace. If no approved pace exists, the UI says so instead of inventing one.
- Salary-cycle opportunities progress by calendar month anchored to the next expected income date; no 28-day approximation is used.
- The system identifies the first trip deadline with a projected shortfall and its amount.
- It also calculates the minimum uniform per-cycle contribution pace required to satisfy all dated trip targets in chronological order.
- Missing trip budget or date remains explicit and is excluded from the sufficiency verdict until completed.
- All results are analytical only: no automatic reservation, budget change, contribution change, or financial transaction is created.
