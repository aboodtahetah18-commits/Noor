# Mustaqbali Design System — Executable CR-002

This directory is the only allowed source of truth for new visual foundations.

## Load order
1. `tokens.css` — CR-002 brand, spacing, type, radius, motion and compatibility aliases.
2. `themes.css` — light/dark semantic mappings only.
3. `typography.css` — global type foundations using Tajawal.
4. `foundations.css` — focus, media safety and base platform behavior.
5. `responsive.css` — exactly four governed viewport bands.
6. `contracts.css` — shared primitive presentation contracts.

Legacy `src/app/globals.css` and `src/app/uiux-governance.css` remain temporarily for compatibility and are frozen by hash. Do not append fixes to them.

New work must flow through `src/components/ui` and shared layout components. Pages compose components; pages do not introduce a parallel token system, arbitrary brand values, or custom breakpoint taxonomy.
