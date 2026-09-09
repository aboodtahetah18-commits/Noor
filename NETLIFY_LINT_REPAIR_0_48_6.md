# Netlify Lint Repair — v0.48.6

## Root cause from Netlify log

The production quality gate reached ESLint successfully, then stopped because `eslint . --max-warnings=0` reported 2 errors and 4 warnings. Because the project intentionally uses `--max-warnings=0`, warnings are deployment-blocking as well.

## Repairs

1. `src/app/(protected)/expenses/page.tsx`
   - Replaced internal HTML anchors with `next/link` for `/cycles/new` and the bank-operations route.

2. `src/infrastructure/db/client.ts`
   - Replaced the banned `Function` cast with an explicit callable signature.
   - Removed `any`-based property access from the lazy Neon proxy and uses `Reflect.get` instead.

3. `src/app/(protected)/internal-funding/page.tsx`
   - Removed unused `categoryCapacity` local binding.

4. `src/app/(public)/login/bootstrap-owner-form.tsx`
   - Replaced `window.location.assign('/onboarding')` with Next.js `useRouter().replace()` and refresh.

5. `src/repositories/report-repository.ts`
   - Removed unused `calculatePercentage` import.
   - Removed unused `nonNegative` helper.

## Scope

No financial calculations, business rules, transaction semantics, database schema, migrations, or Neon configuration were changed.

## Verification

- Dedicated v0.48.6 lint-repair structural verifier: PASS.
- Existing P48/P47 structural regressions are retained.
- Full ESLint/TypeScript/Build remains authoritative on Netlify because the source package contains no installed dependency tree in the execution sandbox.
