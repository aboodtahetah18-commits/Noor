# Build 17 — Shell Contrast & Header Cleanup

## Visual issues repaired from the latest screenshots
- Light theme top bar is now dark like the right sidebar, per the approved shell rule.
- White/dark-surface logo now has correct contrast in light theme because the top bar remains dark.
- Removed the duplicated route label beside the top-bar logo.
- Removed the legacy decorative circular pseudo-element that was cutting into page headers.
- Light-theme page headers now use the approved soft-blue surface with stronger border/shadow.
- First-run dashboard state uses a real Lucide icon instead of the ambiguous Arabic glyph.
- Dark first-run state has stronger kicker/title/body contrast.

## Verification
- UI token compliance: PASS — 342 UI source files
- P47 closure: PASS — 63 protected pages
- Route integrity: PASS — 67 pages / 123 links
- P49.11: PASS
- No gradients remain: PASS
- CSS literal \\n count: 0
- CSS brace balance: 0

Fingerprint: BUILD17-SHELL-CONTRAST-HEADER-CLEANUP
