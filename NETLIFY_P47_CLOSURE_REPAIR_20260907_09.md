# Netlify P47 Closure Repair — Build 09

## Root cause
`scripts/verify-p47-closure.mjs` uses a source-level governance check: every protected `page.tsx` must contain the substring `p47-` unless explicitly excepted.

The two rebuilt pages were visually governed but their class names did not include a P47 marker:
- `src/app/(protected)/cycles/new/page.tsx`
- `src/app/(protected)/more/page.tsx`

## Repair
Added `p47-closure-page` to the root page class of both pages. No runtime behavior, route, business logic, financial logic, or database behavior changed.

## Verification
- P47 closure audit: PASS (63 protected pages)
- Route integrity: PASS (67 pages / 123 static links)
- UI token compliance: PASS (338 UI source files)
- P49.11 governed visible UI system: PASS
- no gradients remain: PASS
