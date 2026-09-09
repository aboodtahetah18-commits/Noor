# Netlify UX-P29 Profile Trigger Regression Fix — 2026-09-09

## Failure observed
Netlify quality gate reached the Vitest regression suite and reported exactly one failing test:
`tests/integration/uxp29-responsive-root-cause-contract.test.ts`.

The stale assertion required `mobile-top-bar.tsx` not to contain `profile`, reflecting an older contract where the profile trigger had been removed.

## Current approved contract
The mobile header intentionally includes `ProfileTrigger`, per the current product requirement. The regression contract now verifies:
- the mobile header is explicitly RTL (`dir="rtl"`),
- the approved `ProfileTrigger` is present,
- the mobile profile-trigger class is present,
- the menu trigger and brand zone remain present,
- the existing overflow/ellipsis/min-inline-size protections remain enforced,
- the obsolete three-column `38px minmax(0,1fr) auto` layout remains prohibited.

## Scope
Only the stale test contract was updated. No runtime application behavior, styling, authentication logic, or financial logic was changed by this repair.
