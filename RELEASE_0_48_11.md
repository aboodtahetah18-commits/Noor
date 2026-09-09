# Release 0.48.11 — Vitest Alias + Mobile Contract Repair

## Scope

P48.6 — Netlify quality-gate module resolution and mobile hardening closure.

## Fixed

- Added the runtime `@` alias to `vitest.config.ts`, mapping `@` to `src`, matching the TypeScript path contract.
- Restored required mobile bottom-navigation destinations: `/transactions`, `/expenses`, `/advisor`, and `/settings` alongside `/dashboard`.
- Added the mobile responsive data label for the transaction amount surface (`data-label="المبلغ"`).

## Root cause

The source modules reported as missing by Netlify were present in the repository, but Vitest had no alias resolver for `@`. TypeScript path aliases do not automatically configure Vite/Vitest runtime module resolution.

## Expected impact

- The 29 import-time suite failures should load normally under Vitest.
- The two Phase 32 mobile hardening assertions should pass.
- No database migration is introduced.
