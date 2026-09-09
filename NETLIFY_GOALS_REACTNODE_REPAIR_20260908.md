# Netlify Goals ReactNode Type Repair — 2026-09-08

## Symptom
Netlify quality-gate typecheck failed in `src/app/(protected)/goals/page.tsx` because `data.cycle.startDate` / `endDate` were inferred as `unknown` and therefore were not assignable to `ReactNode`.

## Root Cause
`rawSql` intentionally exposes database rows as `Record<string, unknown>`. `getGoalCycleReadiness()` returned the raw active-cycle row directly instead of normalizing it into an application-facing type. The database-driver boundary therefore leaked `unknown` into the React page.

## Fix
Added the explicit `GoalCycleReadinessCycle` application contract and normalized the active cycle row at the query boundary:
- `id: string`
- `startDate: string`
- `endDate: string`
- `nextIncomeDate: string | null`

No `any`, `as any`, `@ts-ignore`, or `@ts-nocheck` was introduced.

## Verification
A local global-TypeScript diagnostic can run only without the project's missing dependencies, so it emits expected missing `next/react/node` type noise. The specific reported `unknown is not assignable to ReactNode` failure at goals page line 28 is absent after the change.

Full dependency-backed `npm run quality:gate` / Netlify build: NOT VERIFIED in this environment.
