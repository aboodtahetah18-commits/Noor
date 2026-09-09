# P44.23 — Surplus Routing

- Added explicit, draft-only surplus routing after deficit reaches zero.
- Priority guidance: emergency rebuild → underfunded dated goals → internal funding recovery (emergency before investment) → investment → cycle reserve.
- No automatic allocation and no financial movement is created by this page.
- Draft allocations cannot exceed the currently available optimizer surplus.
- Known needs expose a cap for context, but the user controls the amount.
- Added migration `20260903_043_surplus_routing_drafts.sql`.
