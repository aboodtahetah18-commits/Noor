# P49.1 — CI / Runtime Parity Guard

## Goal
Prevent deployment-only regressions where TypeScript accepts source aliases but Vitest cannot resolve them, and catch critical mobile contract drift before the expensive lint/typecheck/test/build stages.

## Added
- `scripts/verify-p49-1.mjs`.
- Cross-check of TypeScript `@/* -> ./src/*` and Vitest runtime alias wiring.
- Static resolution audit for every `@/...` import used by test files.
- Mobile bottom-navigation route contract checks.
- Mobile transaction amount label check.
- P49 guard runs first in `quality:gate` for fast, precise failure reporting.

## Repair included
- Vitest now resolves `@` to `src` at runtime.
- Required mobile navigation destinations restored.
- Transaction amount surface exposes `data-label="المبلغ"` for mobile labeled-card behavior.

## Financial safety
No financial calculation, state transition, recommendation rule, transaction semantic, or database schema changed.

## Database
No migration added. Migration inventory remains 64.
