# P70.6 — Combined Netlify Contract + CSS Repair

This package combines both previously required fixes in one source tree:

1. Navigation contract tests now match the approved profile-trigger removal:
   - `<DesktopTopNav />`
   - `<TabletTopNav />`
   - `<MobileBottomNav />`
   - no legacy `profile={headerProfile}` assertion remains in the three failing tests.

2. The P70 CSS block in `src/app/globals.css` uses real newline characters, not literal `\n` sequences.

No profile trigger is restored. No financial logic, database schema, auth behavior, or route set is changed.
