# Mustaqbali Build 20 — Final cross-device audit

Scope: desktop, mobile, light theme, dark theme, navigation shell, dialogs/forms, responsive containment, route integrity, visual-token governance, accessibility contracts, and source-level production readiness.

## Findings corrected in Build 20
- Desktop topbar grid had a later Build 18 override (`actions search brand`) that reversed the approved visual placement. Final override restores brand/menu to the right and profile/alerts/settings/theme actions to the left in RTL.
- Native title tooltip was removed from the theme toggle to avoid stray browser tooltips during visual QA.
- Dialogs, profile/security/settings forms, and compact filter overlays now receive explicit light/dark surface, text and border mappings.
- Mobile dialogs and filter overlays receive a strict viewport containment rule; profile/security/settings forms collapse to one column below 768px.

## Static verification results
- 67 application pages discovered.
- 123 static internal links scanned; route integrity PASS.
- 63 protected pages inherit the mobile overflow contract.
- UI token compliance PASS across 342 UI source files.
- P49.11 governed visual system PASS; no gradients.
- P47 closure PASS across 63 protected pages.
- UX-P29 readiness PASS, including Tajawal, breakpoints, dark mode, focus-visible, reduced motion, 44px targets, and Saudi Riyal sign.
- P50 acceptance PASS: 17 critical pages, 18 mutation surfaces, 66 migrations.
- P57 integrity contract PASS: 79 test files, 66 migrations.
- P58 UAT/hardening contract PASS.
- P64 final scope closure contract PASS.

## Runtime caveat
The local audit runtime is Node 22/npm 10 while the project intentionally requires Node 24.20.x/npm 11.x and does not ship a fabricated package-lock. Therefore Netlify remains authoritative for the final dependency install, TypeScript/lint/test/build execution. Build 20 does not claim a local full `next build` under a mismatched runtime.
