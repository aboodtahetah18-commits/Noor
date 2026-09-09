# P46.26 + P46.27 — Recovery obligations in cycle planning

- The next unpaid installment for each internal-funding source is automatically considered in the active cycle's planning demand.
- Recovery demand is split into principal and growth and is shown before optional goals/flexible spending.
- A planned recovery obligation is a reservation in financial capacity only. It is not a paid repayment and does not create a bank transfer.
- Payment remains an explicit TRANSFER action through the internal-funding recovery workflow.
- If a prior installment remains unpaid, it stays overdue and is carried into the current planning view; the next installment is not silently advanced.
- At most one installment per source is considered in a cycle because any source already paid in the active cycle is excluded until a later cycle.
- Final plan snapshots persist the recovery demand and its breakdown for auditability.
