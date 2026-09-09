# Phase 18 — Savings

Status: IMPLEMENTED
Version: 0.18.0

Implemented:
- Saving Allocation lifecycle integration with financial plan versions.
- API-Q-030 Savings Summary: planned / allocated / actual transferred / remaining / status.
- API-C-030 Saving Transfer with authenticated ownership and idempotency.
- Actual Saving derives only from posted saving transfers.
- Atomic internal money movement using a Saving Transfer Header + OUT/IN ledger legs.
- Saving transfer is not an expense and has zero net effect on total user liquidity.
- Concurrency guard on the saving allocation prevents over-transfer.
- Allocation state transitions are audited.
- Transaction history hides the internal IN leg so the user sees one saving-transfer event.
- Migration 20260902_016_savings_integrity.sql adds the physical saving-transfer model and updates account balance projection.

Important architecture note:
The reference contracts require from_account_id and to_account_id for SAVING_TRANSFER while actual saving must come from POSTED financial movements. Phase 18 resolves the previously identified specialized-transfer physical gap by applying the already-approved internal-transfer principle: one transfer header with two ledger legs, while counting the header amount once for Actual Saving.

Not changed:
- Required Financial Buffer remains unresolved (ISSUE-0002).
- Emergency fund formulas remain Phase 19.
- No automatic reallocation among goals or saving targets was invented.
