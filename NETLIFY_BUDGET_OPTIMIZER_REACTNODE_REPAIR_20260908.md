# Netlify Budget Optimizer ReactNode Repair — 2026-09-08

## Symptom
Netlify quality gate failed during TypeScript checking:

`src/app/(protected)/budget/optimizer/review/page.tsx(17,104): error TS2322: Type 'unknown' is not assignable to type 'ReactNode'.`

## Root Cause
`getSalaryAllocationOptimizer()` exposed the current financial cycle directly from the generic Neon `rawSql` result. The shared SQL boundary intentionally represents each raw column as `unknown`, so `cycle.name` remained `unknown` in both optimizer pages.

## Affected Scope
- `src/features/budget-optimizer/queries/get-salary-allocation-optimizer.ts`
- Consumer: `src/app/(protected)/budget/optimizer/page.tsx`
- Consumer: `src/app/(protected)/budget/optimizer/review/page.tsx`
- Consumer through final plan review: `src/features/plan-finalization/queries/get-final-plan-review.ts`

## Fix
Added an explicit `SalaryOptimizerCycle` application contract and normalized the raw SQL row at the query boundary:
- `id: string`
- `name: string`
- `startDate: string`
- `nextIncomeDate: string | null`

This prevents the generic `unknown` SQL shape from leaking into React consumers.

## Verification
- Confirmed the failing JSX expression is `data.cycle.name` at line 17 of the review page.
- Confirmed both optimizer pages consume the same query contract and are covered by the boundary fix.
- Global dependency-backed TypeScript/Next.js build: NOT VERIFIED locally because project dependencies are not installed in this execution environment.
