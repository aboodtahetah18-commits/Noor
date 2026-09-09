# Netlify Recurrence Type Repair — 2026-09-08

## Root Cause
`parseRecurrence()` correctly returned `ObligationRecurrence | undefined`, but two server actions passed the result directly into a required `recurrence: ObligationRecurrence` field. Netlify TypeScript strict checking therefore rejected `undefined` as not assignable to `"ONCE" | "MONTHLY" | "QUARTERLY" | "SEMI_ANNUAL" | "ANNUAL"`.

## Repair
- `src/app/(protected)/obligations/actions.ts`: validate parsed recurrence before command invocation.
- `src/app/(protected)/onboarding/actions.ts`: validate parsed recurrence before command invocation.

## Safety
No `any`, `as any`, `@ts-ignore`, or weakening of strict mode was used.

## Verification
- Both affected call sites inspected and repaired.
- JavaScript syntax checks for active deployment/quality-gate scripts pass.
- Full dependency-backed TypeScript/Next.js build: NOT VERIFIED locally because the provided source bundle does not contain `node_modules` or `package-lock.json` and the local runtime differs from the project's declared runtime.
