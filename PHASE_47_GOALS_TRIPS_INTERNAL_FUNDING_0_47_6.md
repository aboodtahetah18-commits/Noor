# P47.5 + P47.6 — Goals, Trips, Internal Funding & Recovery UX

## P47.5 — Goals and trips
- Rebuilt `/goals` as a financial-goal portfolio rather than a stack of generic cards.
- Added an explicit cycle funding strip: total remaining, required this cycle, approved this cycle, and visible gap.
- Each goal now presents remaining balance, deadline/cycles, current-cycle requirement, approved contribution, and gap in one decision surface.
- Goal detail keeps all P46 trip functionality but receives a clearer hierarchy around goal KPIs, funding timeline, and trip workspace.
- No automatic cross-goal allocation was introduced.

## P47.6 — Internal funding and recovery
- Rebuilt `/internal-funding` around funding cases instead of a dense ledger table.
- Each case presents source, approved amount, actual usage, growth, actual remaining debt, and lifecycle state.
- Recovery remains a transfer workflow and is not reclassified as income or expense.
- Recovery schedule and future recovery impact remain functionally unchanged, with clearer visual grouping.
- Fixed recovery schedule source rendering guard when a source group is empty under strict TypeScript indexing.

## Financial integrity
No financial formula, 10% growth rule, source priority, recovery accounting, trip funding logic, or transaction semantics were changed.

## Database
No migration required. Migration count remains 64.
