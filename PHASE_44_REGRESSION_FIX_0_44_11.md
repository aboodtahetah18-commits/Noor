# P44.11 — Intelligence null-safety regression fix

- Fixed TypeScript narrowing loss in `services/intelligence.ts`.
- Captures `normalizedMerchant` and `transactionDate` into local non-null variables before callback chains.
- Preserves all P44.10 monthly review functionality.
- Verified with TypeScript strict + noUncheckedIndexedAccess.
