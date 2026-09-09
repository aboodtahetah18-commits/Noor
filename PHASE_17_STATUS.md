# Phase 17 — Obligations

Status: IMPLEMENTED
Version: 0.17.0

Implemented:
- API-Q-020 obligation list with status/cycle filters and required status ordering.
- API-C-020 create ObligationTemplate + first ObligationOccurrence atomically/idempotently.
- Reservation rule: unpaid due on/before next income date is reserved.
- DUE/OVERDUE scheduler using Asia/Riyadh operational date.
- API-C-021 atomic obligation payment with row locking.
- OBLIGATION_PAYMENT PENDING -> POSTED.
- Payment marks occurrence PAID and releases reservation without adding liquidity.
- Recurring next occurrence generation.
- UPCOMING cancellation with reservation release and audit log.
- Transaction details expose linked obligation.
- DB indexes/unique template+due occurrence protection.
- Safe To Spend remains BLOCKED_PENDING_BUFFER_RULE until ISSUE-0002 is resolved.

Scope note:
Partial obligation payment semantics are not defined by the current source contracts. V1 therefore closes an occurrence only when the payment amount equals the occurrence amount; it does not silently invent partial-payment state.

Deployment note:
The existing Netlify preview recovery behavior remains unchanged. Production database migrations are not applied automatically.
