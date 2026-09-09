# MUSTAQBALI — EXECUTION CONTRACT

This file is the mandatory implementation contract for every code or design change in this repository.
If any older phase note, repair note, legacy CSS rule, or implementation pattern conflicts with this file, this file wins unless CR-002 is explicitly superseded by a newer approved source of truth.

## 1. Product authority

- Visual identity authority: CR-002 and `docs/ui-ux/CURRENT_SOURCE_OF_TRUTH.md`.
- Arabic / RTL is the primary product direction.
- Font: Tajawal only unless the approved brand source of truth changes.
- Brand assets must come from the approved repository brand assets. Do not introduce alternative logos, fonts, color palettes, decoration systems, or visual themes.
- Business logic, financial rules, database behavior, security boundaries, and state machines must not be rewritten as part of UI migration unless the task explicitly requires it.

## 2. Architecture rule

Pages do not own the design system.

All new UI must be composed through these layers, in order:

1. `src/design-system/` — tokens, foundations, themes, responsive contracts.
2. `src/components/ui/` — reusable UI primitives.
3. `src/components/layout/` — application shells and layout patterns.
4. route/page components — composition and product-specific data only.

A route must not create a new visual language, breakpoint system, spacing scale, color system, shadow system, radius scale, or error presentation.

## 3. Responsive contract

The only governed viewport bands are:

- Mobile: `< 768px`
- Transitional/tablet: `768px–1023px`
- Desktop: `1024px–1439px`
- Wide desktop: `>= 1440px`

Do not create page-local breakpoints. If a new breakpoint is genuinely required, change the central responsive contract first and add regression coverage before consuming it.

Complex mobile screens and desktop screens may use different composition components. They must share business logic and design-system primitives, not necessarily the same DOM layout.

## 4. Mobile rules

- No horizontal document overflow.
- No desktop table squeezed into a phone unless an explicitly governed responsive table pattern supports it.
- Primary workflows use a full page unless the approved interaction contract explicitly defines a sheet/dialog.
- Short secondary actions may use a bottom sheet.
- Destructive/confirmation interactions may use a dialog.
- Bottom navigation and safe-area insets must never cover actionable content.
- Touch targets, text, controls, and financial values must remain readable without zoom.

## 5. Desktop rules

- Desktop navigation and content shells are independent from mobile navigation composition.
- Desktop layouts must use the governed content/container widths.
- Do not fix desktop defects with mobile overrides or vice versa.
- Wide desktop must remain bounded and readable; do not allow uncontrolled line length or stretched forms.

## 6. Design-token rules

All brand colors, semantic colors, spacing, radii, shadows, typography, z-index, sizing, and layout constants must come from governed tokens.

Do not introduce hard-coded visual values inside route CSS/TSX when an equivalent token exists.

New tokens may only be added to the design-system token registry and must have:
- a semantic name,
- a documented purpose,
- light/dark behavior when relevant,
- usage in at least one governed component,
- automated contract coverage.

## 7. Component rule

Before adding route-local UI, check for an existing governed component.
If the pattern is reusable, create/extend the shared component first.

The following concepts must have shared implementations rather than route-specific copies:
- buttons/actions,
- fields and validation,
- cards/surfaces,
- dialogs/sheets,
- feedback/loading/empty/error states,
- tables/data views,
- tabs/filters,
- page headers,
- responsive action zones,
- financial number rendering.

## 8. Error contract

User-facing errors must map to the governed error taxonomy and presentation layer.
Do not surface raw stack traces, database messages, provider errors, or internal exception strings.

Expected categories:
- validation,
- authentication,
- authorization,
- network,
- conflict,
- not found,
- system.

Presentation must use a shared field error, inline alert, toast, recoverable state, or full-page error component as appropriate.

## 9. Required states

Every new or migrated data-driven screen must account for:
- loading,
- empty,
- populated/success,
- recoverable error,
- unavailable/permission state when applicable.

A screen is not complete if only its happy path is implemented.

## 10. Change sequence

Every visual/product UI change follows this order:

1. Confirm product requirement.
2. Reuse or define the governed UX pattern.
3. Reuse or implement design-system component(s).
4. Implement desktop composition.
5. Implement mobile composition.
6. Implement loading/empty/error/success states.
7. Verify RTL and accessibility.
8. Run static contract checks.
9. Run lint and typecheck.
10. Run tests.
11. Run responsive/browser regression checks when available.
12. Run production build.

Do not bypass a failed gate by weakening, deleting, or excluding the check unless the governing contract itself is intentionally revised.

## 11. Legacy CSS migration rule

`src/app/globals.css` and `src/app/uiux-governance.css` contain historical compatibility layers.
They are migration inputs, not the target architecture.

Effective immediately:
- no new "Build XX fix", "final fix", or page-specific override blocks may be appended to either file;
- new governed tokens/foundations belong in `src/design-system/`;
- new reusable visual behavior belongs in shared components/layouts;
- legacy selectors are removed only as their consuming routes are migrated and regression-tested.

## 12. Definition of done

A UI change is complete only when:
- it follows CR-002 identity,
- no unauthorized brand/font/style is introduced,
- mobile and desktop both satisfy their layout contracts,
- required states are covered,
- no new legacy CSS repair layer is added,
- all mandatory quality gates pass.
