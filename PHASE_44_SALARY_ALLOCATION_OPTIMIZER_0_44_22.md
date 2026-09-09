# P44.22 — Salary Allocation & Deficit Optimizer

## Scope
- Pure read-side optimizer for expected cycle income vs current plan demand.
- Attributes any deficit to concrete plan items instead of a single opaque number.
- Four user-approved planning classes: BASIC, IMPORTANT, FLEXIBLE, DEFERRED.
- Priority order for coverage: BASIC → dated goals → emergency recovery → investment recovery → IMPORTANT → FLEXIBLE → DEFERRED.
- Draft category reductions are simulations only; they do not mutate the approved plan.
- Category classification is editable by the user.
- Explicit goal-cycle commitments replace generic GOAL allocations in optimizer demand when commitments exist, preventing obvious double counting.

## Safety
- No automatic budget reduction.
- No automatic transfer.
- Goal and recovery amounts remain editable only through their authoritative workflows.
- Applying the final scenario to a plan remains a separate approval step.
