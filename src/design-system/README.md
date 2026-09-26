# Namaa Design System — Executable Authority

This directory is the runtime source of truth for Namaa visual foundations.

## Authority
1. `ndos-v1.2.tokens.json` — frozen official identity values and platform metadata.
2. `ndos-v1.2.css` — frozen official Namaa aliases and invariant brand rules.
3. `tokens.css` — executable UX primitives and compatibility aliases mapped to NDOS.
4. `themes.css` — light/dark semantic surface mappings only.
5. `typography.css` — global type roles using **Noto Sans Arabic**.
6. `foundations.css` — focus, media safety and base platform behavior.
7. `responsive.css` — four governed viewport bands.
8. `contracts.css`, `components.css`, `interaction-components.css`, `pages.css` — shared component/page contracts.
9. `ndos-v1.2.acceptance.css` and `ndos-v1.2.enforcement.css` — compatibility/enforcement while legacy page CSS is migrated in later phases.

## Non-negotiable identity rules
- Noto Sans Arabic is the operational font.
- Official logo files under `public/brand/ndos` are used as-is.
- Frozen brand colors are not replaced by screenshot approximations.
- The warm application surface `#FAF9F4` is the light canvas; white `#FFFFFF` remains a card/content surface.
- RTL is the primary direction.
- Existing product capabilities remain available on desktop, tablet and mobile; composition changes by viewport, capability does not.

## Visual reference rule
The user-approved reference images are binding for layout, hierarchy, density and visual composition. The current project remains binding for routes, data, permissions and business behavior. Official identity assets/tokens remain binding for logo, font and frozen brand colors.

## Legacy boundary
`src/app/globals.css`, `src/app/uiux-governance.css`, `src/app/namaa-responsive-polish.css`, `src/app/namaa-shell-visibility.css`, route-local historical styles, and specialized compatibility selectors remain temporarily because existing pages still depend on them. Do not add new visual foundations there. They are retired only as their dependent pages/components migrate.

New visual work must flow through this directory and `src/components/ui`. Pages may compose governed components but must not introduce a parallel palette, font family, spacing scale, radius scale, shadow scale, or breakpoint taxonomy.
