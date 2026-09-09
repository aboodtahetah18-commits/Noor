# Phase 16 — Refund

Status: IMPLEMENTED IN CODE
Version: 0.16.0

Implemented:
- API-C-013 Record Refund flow.
- Refund must reference a valid POSTED EXPENSE.
- Refund is not classified as income.
- Liquidity is restored through POSTED REFUND handling in account_balances_v.
- Category impact uses net actual spend: POSTED EXPENSE minus POSTED linked REFUND.
- Database trigger serializes refunds per original expense and prevents aggregate refunds above the original expense amount.
- Idempotency enforced by transaction idempotency key.
- Original transaction linkage exposed in transaction details.
- RTL refund entry page and navigation from transaction history.

Known boundary:
- Safe To Spend remains blocked by ISSUE-0002 until Required Financial Buffer is approved.
- General reversal of REFUND remains deferred until a dedicated linked-refund reversal handler is implemented.
