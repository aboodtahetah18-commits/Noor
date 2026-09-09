# P49.11 — Visible UI Redesign

## Why this phase exists
P49.9 and P49.10 improved consistency but did not create a sufficiently obvious visual delta. P49.11 intentionally changes the visible shell and all common UI surfaces so the redesign is immediately perceptible.

## Visible changes
- Layered sky/blue application background instead of flat white/gray.
- High-contrast navy/blue page headers across legacy and P47 resource pages.
- Cards/panels gain soft blue borders, depth, and a vertical cyan identity rail.
- KPI cards gain a colored top rail.
- Primary actions use a blue gradient; secondary actions use a tinted surface.
- Inputs/selects/textareas get stronger blue borders and focus rings.
- Dialogs become a clearly separated workspace with a branded header, stronger backdrop, tinted body, and sticky action area.
- Tabs/form steps become visibly segmented.
- Desktop sidebar gets a richer navy-to-teal gradient with cyan active-state rail.
- Mobile top/bottom navigation adopts the same identity.

## Scope safety
No financial rules, transaction semantics, state-machine transitions, schema, migrations, or Neon data behavior changed.
