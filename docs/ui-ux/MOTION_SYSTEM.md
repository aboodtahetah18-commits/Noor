# Motion & Interaction System — UX-P25

PHASE: UX-P25
STATUS: APPROVED
DECISION: DEC-UI-028
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
Authoritative interaction-motion contract. Motion clarifies cause/effect, hierarchy and continuity; it must never become decorative noise or delay financial work.

## Motion principles
1. Prefer immediate response with short motion after state change.
2. Use existing P08 motion tokens; no arbitrary durations/easing.
3. Motion never carries meaning alone.
4. Avoid large parallax, bounce, looping decoration or financial “celebration” effects that reduce professional trust.
5. Spatial direction follows RTL semantics where movement represents navigation.

## UX-P25-S01 — Hover
- Desktop/pointer only; Hover supplements but never replaces focus/selected state.
- Use restrained surface/border/icon emphasis without layout shift.
- No hover-dependent essential action disclosure without an equivalent keyboard/touch path.

## UX-P25-S02 — Focus
- Keyboard focus is always visible and token-driven.
- Focus indication is not removed for visual cleanliness.
- Focus follows logical RTL/task order and remains distinct from hover/selected/error.

## UX-P25-S03 — Pressed
- Pressed gives immediate tactile visual response without changing control dimensions.
- Prevent duplicate submits through state logic, not prolonged animation.
- Touch pressed feedback must remain perceptible on Mobile.

## UX-P25-S04 — Page transition
- Default navigation favors fast content replacement with minimal fade/continuity where useful.
- Do not animate entire financial dashboards with large directional slides by default.
- Preserve scroll/context intentionally on filters/details; navigation rules from P22 govern destination semantics.

## UX-P25-S05 — Modal motion
- Modal enters/exits with short opacity + subtle scale/position continuity using approved tokens.
- Backdrop and dialog motion are synchronized; focus moves after the dialog is interactable.
- Closing never delays destructive/safety feedback unnecessarily.

## UX-P25-S06 — Drawer motion
- Drawer/side panel movement follows its physical edge and RTL layout semantics.
- Mobile Bottom Sheets move vertically from the bottom; they are not treated as horizontal drawers.
- Background content remains visually stable and non-interactive while modal drawer/sheet is active.

## UX-P25-S07 — Accordion motion
- Animate height/opacity only when it improves orientation; avoid content jumps.
- State is explicit via `aria-expanded` intent and icon rotation/shape where applicable.
- Content remains available immediately under reduced motion.

## UX-P25-S08 — Loading motion
- Spinners/progress indicators are restrained and purposeful.
- Skeleton shimmer is optional; static skeleton is acceptable and preferred under reduced motion.
- Never use indefinite animation where the system has already failed or needs Retry.

## UX-P25-S09 — Success feedback
- Success uses subtle transient emphasis/check-state; no confetti, bouncing money, fireworks or celebratory decoration.
- Consequential financial success emphasizes the resulting data/state, not animation.
- Toast/inline persistence follows P23.

## UX-P25-S10 — Reduced motion
- Respect `prefers-reduced-motion` or equivalent platform preference.
- Remove/shorten non-essential transforms, directional movement, shimmer and animated scroll.
- Preserve state changes, focus, loading identity and success/error meaning without requiring animation.
- No essential workflow depends on animation timing.

## Accessibility handoff
P26 must certify keyboard focus visibility, reduced-motion implementation, animation-trigger safety, live feedback and interaction target behavior.
