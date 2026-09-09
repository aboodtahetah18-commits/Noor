# UXP29-20260905-04 — Responsive Root-Cause Repair

## Scope
- AUD-P29-002 Mobile Header Horizontal Clipping / RTL Overflow
- AUD-P29-003 Incorrect breakpoint behavior at 767px

## Root causes repaired
1. Mobile header CSS still retained a removed profile-trigger column, leaving a three-column grid after the profile trigger was removed. The title therefore received an undersized track at compact widths.
2. A client-side compact-filter breakpoint used `min-width: 769px`, diverging from the canonical CSS Medium boundary at 768px.
3. Legacy responsive rules could still style mobile navigation through 1023px. A canonical final governance layer now explicitly selects exactly one navigation shell for <=767, 768–1023, and >=1024.

## Systemic repair
- Mobile header uses `minmax(0,1fr) auto` only.
- Brand/title and main-content receive logical `min-inline-size:0` / max-inline sizing.
- Title truncates safely inside its grid track instead of creating page-level overflow.
- Utility actions remain fixed-size and non-shrinking.
- Mobile header is bounded to the viewport with `inline-size:100%`, `max-inline-size:100vw`, and `box-sizing:border-box`.
- No `overflow-x:hidden` masking was added.
- JS compact breakpoint changed from 769px to 768px.
- Canonical navigation visibility is globally enforced:
  - <=767: Mobile top bar + mobile primary navigation; tablet/desktop shells hidden.
  - 768–1023: Tablet shell only.
  - >=1024: Desktop shell only.
- No business logic, identity, feature, or approved UX changes.

## Regression results completed locally
- Static Token Compliance: PASS — 336 UI source files audited.
- Route Integrity: PASS — 67 pages, 117 static internal links.
- UX-P29 readiness static contract: PASS.
- P57 responsive/accessibility verification: PASS — 78 test files, 65 migrations inventoried.
- P49.13 global mobile compact contract: PASS — 63 protected pages.
- Mobile horizontal-overflow systemic contract: PASS — 63 protected routes inherit the canonical compact-shell contract.

## Environment limitation
Full dependency installation / local production build could not complete in the execution container because npm registry access timed out. Production build must therefore be confirmed by the new Netlify deploy build.

## Runtime overflow assertion added
The post-deploy evidence runner must assert at 320, 360, 390, 430, and 767px on every protected mobile route:

`document.documentElement.scrollWidth <= window.innerWidth`

The source includes `scripts/audit-mobile-horizontal-overflow-runtime.mjs` with the exact assertion contract.
