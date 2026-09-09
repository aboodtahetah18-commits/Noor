# Phase 30 — Onboarding

Status: IMPLEMENTED
Version: 0.30.0

## Scope
- WF-001 Welcome
- WF-002 Accounts + opening balances
- WF-003 First expected income + first cycle draft
- WF-004 Recurring obligations
- WF-005 Savings / Emergency / Goals review
- WF-006 First financial plan handoff and completion

## Important invariants
- Onboarding progress stores workflow state only; financial values remain in their domain tables.
- Account opening balances continue to use account_opening_balances.
- First cycle + first expected income are created atomically and cycle remains DRAFT.
- Savings amount is not duplicated in onboarding; it belongs to the first PlanVersion.
- Goals may be skipped.
- Onboarding cannot complete until an ACTIVE_PLAN exists.
- No Safe To Spend, Forecast, Buffer, goal allocation, or emergency coverage formula is invented.

## Verification
- package.json parses successfully.
- TypeScript parser pass was attempted with global tsc; only unresolved-module errors are expected because node_modules is absent in this execution environment.
- Contract tests added for workflow-only progress, atomic first cycle + expected income, plan gate, and cycle activation/obligation attachment.
