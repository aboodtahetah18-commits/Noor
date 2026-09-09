# Phase 15 — Transfer Between Accounts

Status: IMPLEMENTED

- Transfer Header + OUT + IN ledger entries in one database transaction.
- Same-owner active account and active-cycle checks.
- Same account blocked.
- Idempotency on header and ledger entries.
- User liquidity invariant: net change is always 0.00.
- Transaction history should expose one logical transfer while retaining both ledger entries.
- No Supabase runtime dependency.
