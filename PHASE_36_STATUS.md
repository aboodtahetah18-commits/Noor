# Phase 36 — Accessibility Audit

Status: **COMPLETE**
Version: `0.36.0`

## Scope completed
- Keyboard skip link to the main application content.
- Global, high-visibility `:focus-visible` treatment.
- Minimum 44px interactive target height for primary controls.
- Screen-reader-only utility class.
- Existing form error surfaces promoted to `role="alert"`.
- Existing success callouts promoted to polite live status announcements.
- Navigation landmarks keep explicit Arabic labels and active-page semantics.
- `prefers-reduced-motion`, `prefers-contrast`, and Windows forced-colors support.
- Summary/details controls receive keyboard-friendly targets.
- Mobile, tablet, desktop, and RTL hardening remain isolated and preserved.

## Invariants
- No financial formula changed.
- No state machine changed.
- No database migration added.
- Accessibility behavior is presentation/semantics only.
