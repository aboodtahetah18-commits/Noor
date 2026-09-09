# Netlify Accessibility Contract Repair — Build 04

The failing accessibility contract uses a literal source-string assertion.

## Repair
- Updated `src/app/(protected)/mobile-bottom-nav.tsx` from the compact form
  `aria-current={active?'page':undefined}`
  to the exact governed contract form
  `aria-current={active ? 'page' : undefined}`.
- Confirmed the Arabic mobile navigation label remains present.
- Confirmed the account form still exposes `role="alert"`.
- No runtime behavior, routing, business logic, financial algorithms, or database schema changed.

## Static contract verification
- PASS — mobile nav aria-label
- PASS — mobile nav aria-current exact
- PASS — account role alert
- PASS — test expects same aria-current
