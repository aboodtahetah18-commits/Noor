# Netlify Build Fix 2

Version: 0.16.3

## Root cause fixed
Two budget pages imported `getCurrentCycle` from `src/features/cycles/queries/get-current-cycle.ts`, but that module exports `getCurrentFinancialCycle`.

## Files corrected
- `src/app/(protected)/budget/page.tsx`
- `src/app/(protected)/budget/new/page.tsx`

## Verification
- No remaining `getCurrentCycle` references under `src/`.
- Export name matches the current cycle query module.
- Dependency versions remain on Vite 8 / Vitest 4.1 from the previous Netlify fix.

## Build validation limitation
A full local npm install/build could not complete in the execution environment because package installation timed out. Netlify remains the authoritative build validation environment for this preview.
