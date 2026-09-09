# P44.24 — Final Cycle Plan Review & Approval

- Adds a single final review page at `/budget/optimizer/review`.
- Shows category allocations before/after user-selected reductions.
- Shows approved surplus-routing drafts and explicitly preserves any unassigned surplus as unallocated cash.
- Blocks approval while salary allocation still has a deficit or surplus routing exceeds available surplus.
- On approval, creates a new plan version only when category reductions exist.
- Marks optimizer reductions and surplus-routing drafts as APPLIED only after final approval.
- Surplus routing remains a planning intent; approval does not execute a bank transfer.
- Stores an immutable-style finalization snapshot in `cycle_plan_finalizations` for explainability/audit.
- No automatic reductions, transfers, goal funding, or internal-loan repayments are executed by this step.
