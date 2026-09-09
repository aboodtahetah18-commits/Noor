# Accessibility System — UX-P26

PHASE: UX-P26
STATUS: APPROVED
DECISION: DEC-UI-029
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first
CONFORMANCE TARGET: WCAG 2.2 Level AA baseline

## Purpose
Authoritative accessibility contract for the personal financial platform. Accessibility is treated as a product-quality requirement across interaction, content, states and financial decision support—not as a late visual checklist.

## Standards baseline
- WCAG 2.2 Level AA is the normative conformance baseline for the web experience.
- Native HTML semantics are preferred; ARIA supplements semantics only when native elements cannot express the required pattern.
- WAI-ARIA Authoring Practices interaction patterns inform custom widgets such as comboboxes, dialogs and tabs.
- Product touch-target standard remains 44×44 CSS px minimum for primary interactive controls, intentionally stricter than WCAG 2.2 AA Target Size (Minimum) 24×24 CSS px.

## UX-P26-S01 — Contrast
### Text
- Normal text: minimum 4.5:1 contrast.
- Large text: minimum 3:1 contrast.
- Financial Ink `#0B1220` on white = ~18.72:1.
- Secondary Text `#475569` on white = ~7.58:1.
- Advisor Blue `#2563EB` on white = ~5.17:1 and may be used for standard text where semantically appropriate.
- Signal Cyan `#06B6D4` on white = ~2.43:1 and is prohibited for normal text or essential thin icons on white; use it only on non-essential/decorative accents or against an approved contrasting surface.
- Success `#15803D`, Warning `#B45309`, Error `#B42318` on white all exceed 4.5:1 for text.

### Non-text UI
- Essential boundaries, focus indicators and meaningful icons must reach at least 3:1 against adjacent colors where WCAG non-text contrast applies.
- State/severity never relies on color alone; text + icon/shape/state are required.

## UX-P26-S02 — Keyboard navigation
- Every functional control is keyboard operable.
- `Tab`/`Shift+Tab` move through page-level interactive stops in logical task order; do not use positive `tabindex`.
- Native controls preserve browser keyboard behavior.
- Combobox contract: input participates in Tab order; arrows navigate options; Enter accepts; Escape closes; active option state is exposed programmatically.
- Tabs use roving focus/arrow-key navigation when implemented as an ARIA tab pattern; page Tab order should not contain every tab trigger when the component pattern does not require it.
- Modal dialogs trap focus while open; Escape closes when safe; focus returns to the invoker.
- No hover-only or drag-only essential action; any drag interaction must have a single-pointer/keyboard alternative.
- No keyboard trap anywhere in the product.

## UX-P26-S03 — Focus visibility
- All keyboard-operable controls have a persistent visible focus indicator.
- Focus styling is distinct from hover, selected, error and disabled states.
- Focus must not be fully hidden by sticky headers, bottom navigation, drawers or overlays.
- Use governed focus tokens; do not remove outline without an equal-or-better replacement.
- Programmatic focus changes are limited to task continuity: dialogs, validation summaries, route transitions, destructive confirmation and created-record destinations.

## UX-P26-S04 — Touch targets
- Product minimum target: 44×44 CSS px for standalone interactive controls on Mobile and touch-capable layouts.
- Icon-only controls retain a 44×44 hit area even when the visible icon is 16/20/24px.
- Closely spaced destructive/confirming actions must avoid accidental activation through spacing and clear hierarchy.
- Inline text links may follow text flow, but critical financial actions must not be inline-only targets.

## UX-P26-S05 — Labels
- Every form control has a persistent programmatic label.
- Placeholder is never the sole label.
- Visible label and accessible name must communicate the same action/purpose.
- Required/optional status is communicated in text or programmatic semantics, not color alone.
- Icon-only controls require an accessible name; decorative icons are hidden from assistive technology.
- Financial amount/date/category fields include format guidance when the expected format is not obvious.

## UX-P26-S06 — Screen reader semantics
- Page structure uses landmarks (`header`, `nav`, `main`, `aside`, `footer` where applicable) and a logical heading hierarchy.
- Native semantic controls (`button`, `a`, `input`, `select`, `table`) are preferred.
- Tables expose headers and relationships; mobile card transformations preserve equivalent labels and data relationships.
- Status messages use non-interruptive live status semantics where appropriate; blocking errors use alert semantics sparingly.
- Modals expose dialog semantics, name/description and modal state; background content is inert/non-interactive while active.
- Alerts/severity expose textual meaning in addition to color/icon.
- Dynamic counts, save results and async feedback are announced without forcing focus unless task recovery requires it.

## UX-P26-S07 — RTL accessibility
- Document/page language is Arabic where Arabic content is primary, with `dir=rtl` at the correct root/container.
- Logical source/reading order matches the visible RTL task order; visual CSS reordering must not create a contradictory keyboard/screen-reader sequence.
- Directional navigation icons mirror by semantic direction; non-directional icons do not.
- Financial numeric values may use isolated LTR number runs while surrounding labels remain RTL.
- Mixed Arabic/Latin identifiers use direction isolation to prevent punctuation/value corruption.

## UX-P26-S08 — Error accessibility
- Error identification uses text, not color alone.
- Field errors are programmatically associated with the corresponding control and reflected with invalid-state semantics where appropriate.
- On failed submit, preserve entered data and move/announce focus to a useful error summary or first invalid field according to form length/context.
- Error messages explain what happened and how to recover; no backend codes or infrastructure terms are exposed to the user.
- Financially consequential actions support review/correction/confirmation where required; destructive actions follow P23 Confirmation/Undo rules.

## UX-P26-S09 — Motion accessibility
- Respect `prefers-reduced-motion` or equivalent platform preference.
- Remove or substantially reduce non-essential transforms, parallax, shimmer and animated scrolling under reduced motion.
- No essential meaning or workflow depends on animation.
- No flashing content that creates seizure risk.
- Loading identity, success/error meaning and focus remain clear when animation is suppressed.

## UX-P26-S10 — Accessibility audit
### Certified design-contract checks
- Contrast contract: PASS.
- Keyboard operability contract: PASS.
- Focus visibility/not-obscured contract: PASS.
- Product touch target 44×44 contract: PASS.
- Label/accessibility-name contract: PASS.
- Screen-reader semantics contract: PASS.
- RTL/source-order contract: PASS.
- Error accessibility contract: PASS.
- Reduced-motion contract: PASS.

### Implementation verification handoff
P29/P30 must verify the built UI against this contract using browser keyboard testing, screen-reader spot checks, automated accessibility scanning, zoom/reflow and real rendered contrast. P26 certifies the design/system specification, not an uninspected future implementation.
