# Netlify TypeScript Strict Repair — v0.46.44

This hotfix addresses strict TypeScript failures exposed by Netlify after v0.46.43.

## Repairs
- Explicitly narrows authenticated-user null state before returning a protected user.
- Preserves onboarding `cycleId` as a non-null local after the prerequisite redirect.
- Makes report not-found flow explicit before passing the report to its view.
- Narrows monthly-cycle-review and internal-funding values before calculation.
- Hardens future-pressure window indexing for `noUncheckedIndexedAccess`.
- Hardens learning-ranking unit tests against unchecked array indexing.
- Removes stale `tsconfig.tsbuildinfo` from the distributable so Netlify type-checks from a clean project state.

## Financial behavior
No business rule, amount, forecast formula, budget allocation, recovery rule, trip rule, or recommendation-ranking policy was changed.

## Verification
- Phase 41 structural verification: PASS.
- Phase 42 compatibility verification: PASS.
- P45.9 verification: PASS.
- Targeted strict TypeScript diagnostics for the repaired files: cleared in the available compiler pass.
- Full dependency-backed Next.js build cannot be certified in this execution environment because project dependencies are not locally installed.
