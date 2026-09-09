# Mustaqbali Build 12 — Theme & Brand Repair

Date: 2026-09-07
Scope: UX / visual shell only. No financial-domain or database logic changed.

## Implemented
- Light appearance is now the explicit default regardless of the operating-system theme.
- Added a persistent user-controlled Light/Dark theme toggle using localStorage.
- Added the theme control to desktop, tablet, mobile, and login surfaces.
- Replaced OS-driven dark-mode activation with explicit `data-theme` governance while retaining the UX-P29 compatibility audit hook.
- Repaired light/dark contrast for page, cards, fields, top bar, bottom navigation, drawer, financial hero, and authentication surfaces.
- Enforced colored logo on light mobile/tablet surfaces and white logo on dark surfaces.
- Kept the white logo on permanently dark brand surfaces such as desktop sidebar and login brand panel.
- Added governed Sun/Moon icons to the existing Lucide subset.

## Verification
- `node scripts/verify-ui-token-compliance.mjs` — PASS (339 UI source files audited).
- `node scripts/verify-ux-p29-ready.mjs` — PASS.
- Full local TypeScript/build validation was not available in this runtime because the uploaded source package did not contain `node_modules`/a usable lockfile and dependency installation timed out. Netlify remains the authoritative full build environment.
