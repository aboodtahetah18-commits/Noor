# P46.22 + P46.23 — Trip gap resolution and internal recovery policy

## Gap resolution order
1. User-approved reductions from currently unused FLEXIBLE budget headroom.
2. Emergency-fund-role accounts.
3. Investment-role accounts.

No source is moved automatically. The user enters the amounts and the combined resolution must exactly equal the trip funding gap.

## Flexible budget governance
A flexible reduction is recorded as `REVISION_PENDING` and does not silently mutate the approved financial plan. The existing plan-revision workflow is used to review and approve the proposed new amounts.

## Internal funding
Emergency and investment amounts create a PLANNING internal-funding case linked to the exact goal event/trip. One active/recovery funding case per trip is enforced.

## Recovery
The user chooses a recovery-cycle count. Recovery strategy is `PROPORTIONAL_ACTUAL_USE`.
The 10% growth contribution applies only to amounts actually allocated to funded transactions. Unused approved funding is returned without growth.

The pre-use recovery number is only a maximum scenario if all approved internal funding is eventually used; actual repayment remains derived from actual expense allocations.
