# Phase 19 — Emergency Fund

Status: IMPLEMENTED
Version: 0.19.0

Implemented:
- Emergency fund configuration with user-entered target only.
- NOT_CONFIGURED / BUILDING / FUNDED / DEPLETED.
- Atomic emergency contributions and withdrawals as two-leg ledger movements.
- Withdrawal reason and emergency type are mandatory.
- Idempotency and ownership checks.
- Withdrawals cannot exceed current emergency balance.
- Emergency movements are transfers inside user liquidity; they are not EXPENSE/INCOME.
- Transaction history hides internal IN ledger leg.
- Coverage months remains blocked by ISSUE-0006; no formula invented.
- Migration 20260902_017_emergency_fund_integrity.sql.
