# Desktop Layout System — UX-P13

PHASE: UX-P13
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-016
DEVICE: DV-DESKTOP

## Governance
This file is the authoritative Desktop layout composition baseline. It consumes UX-P07–P12 foundations and does not redesign individual screens. Screen-specific composition belongs to UX-P14/P15; responsive interpolation belongs to UX-P19; detailed tables/forms/navigation belong to UX-P20/P21/P22.

## 1. Desktop shell
The authenticated Desktop experience uses a two-region shell:

1. Persistent RTL sidebar at logical start.
2. Flexible main workspace containing an optional utility topbar and the page content container.

Rules:
- Desktop boundary begins at `--ux-bp-desktop` = 1024px.
- Shell is RTL-native; use logical start/end properties.
- The page viewport must not depend on horizontal document scrolling for normal use.
- Persistent shell layers use governed z-index tokens only.
- The sidebar may remain fixed/sticky, but its internal navigation MUST be vertically scrollable on short viewports.
- Onboarding/authentication may use a dedicated shell exception when the journey requires focus and no product navigation.

## 2. Sidebar
Purpose: primary product navigation, account context and stable orientation.

### Width
- Standard: 240px conceptual shell width, implemented through a governed layout constant derived in this phase.
- Compact Desktop treatment may reduce visual padding at constrained Desktop widths, but navigation labels remain visible; exact responsive collapse is deferred to UX-P19/UX-P22.

### Structure
RTL top-to-bottom order:
1. Brand/account anchor.
2. Primary navigation groups aligned to the approved IA.
3. Contextual utility/action shortcut only when globally meaningful.
4. Settings/account utility region.

### Behaviour
- Internal navigation region: `overflow-y:auto`.
- Footer/utility actions must remain reachable without clipping.
- Active route must be visible using component/state rules; color alone cannot carry state.
- No duplicate primary navigation in the topbar.
- Sidebar spacing consumes P11 tokens only.

## 3. Topbar
The Desktop topbar is a contextual utility bar, not the primary navigation system.

Allowed content:
- page/global search entry when applicable;
- alert entry point;
- profile/account trigger;
- compact contextual utilities.

Rules:
- May be sticky when needed using `--ux-z-sticky`.
- Must not duplicate the sidebar IA.
- Height/control sizing derives from P08/P12 component sizes; no new raw dimensions.
- Search may expand only when the page/context supports it; global search behavior remains deferred.
- If a page does not need a topbar, the shell may omit it without breaking alignment.

## 4. Main content area
Default authenticated content:
- centered within `--ux-container-content` = 1200px.
- wide/data-dense exception: `--ux-container-wide` = 1280px with documented information-density justification.
- page inline padding: 32px Desktop; 40px Wide Desktop.
- 12-column grid, 24px gutters.

Recommended composition:
- 12/12: primary full-width content.
- 8/4: primary + supporting rail/details.
- 6/6: peer content only when both have equal priority.
- 4/4/4: summary cards.
- 3/3/3/3: compact metrics only, not narrative content.

Rules:
- Reading flows use `--ux-container-reading` = 640px.
- Focused forms use `--ux-container-form` = 720px.
- Do not stretch text or forms to the entire data container.
- Dense content must preserve a clear primary information block before supporting blocks.

## 5. Page header
Every standard page header defines:
- Primary information: page title.
- Secondary/supporting information: optional description/status/context.
- Primary action: maximum one visually dominant action.
- Secondary actions: grouped separately.
- Destructive action: never visually equal to the primary action.

Desktop composition:
- title/context at logical start;
- action group at logical end when space permits;
- actions wrap below the title rather than compressing labels below usable sizes.
- standard gap from header to first content section follows P11 section/internal spacing.

## 6. Action area
Action hierarchy:
1. one primary action per immediate page context;
2. secondary actions as secondary buttons/menus;
3. tertiary/icon actions only for low-emphasis contextual operations;
4. destructive actions separated spatially/semantically.

Rules:
- Repeated row actions remain local to rows rather than promoted to the page header.
- Bulk actions, when applicable, occupy a dedicated contextual action bar above the data region.
- Sticky action areas are reserved for long task flows where loss of the primary action is a proven usability risk.
- Action bars must use P12 Button families and P11 spacing.

## 7. Filters area
Desktop filter composition:
- placed directly above the data/list region it controls;
- open/visible by default when filter complexity is moderate;
- search field leads, followed by high-value filters, then less-used filters;
- active filters must remain visible as state, with a governed clear/reset affordance in detailed UX-P21/P22/P20 phases.

Layout:
- standard filter row may span 12 columns;
- controls use responsive wrapping; no forced horizontal page scroll;
- advanced filters may use a secondary row/panel rather than overcrowding the primary row.

## 8. Details panel
A details panel is a supporting Desktop pattern, not a mandatory page template.

Preferred use:
- inspecting a selected transaction/entity while preserving list context;
- explanatory financial context;
- supporting metadata that should not compete with the primary task.

Rules:
- canonical split: 8-column main + 4-column details at sufficiently wide Desktop widths.
- panel may be sticky within viewport only when its content height remains usable; otherwise normal document flow.
- details panel cannot contain a second independent primary navigation.
- if the detail task becomes complex/long, route to a full page rather than overloading the panel.

## 9. Desktop modal rules
Desktop overlays consume P12 component architecture:
- Modal: focused interruptive task/confirmation.
- Drawer: contextual side task/details when page context should remain visible.
- Bottom Sheet: not the default Desktop overlay; reserved for device-specific cases elsewhere.

Rules:
- Modal width is purpose-based; use reading/form constraints rather than arbitrary widths.
- Backdrop uses approved surface/alpha tokens.
- Focus trapping, keyboard escape and focus restoration are required contracts; final accessibility certification is UX-P26.
- Long forms/data must not be forced into a modal when a page route is more appropriate.
- destructive confirmation must state consequence and provide explicit cancel/confirm actions.

## 10. Desktop density
Three density modes are approved as composition intent, not user-selectable themes:

### Comfortable
Default for dashboards, planning and explanatory financial content.
- standard card padding: 24px;
- standard section gaps: 48px;
- full readable labels/descriptions.

### Standard
Default for operational lists/forms.
- card/form spacing follows P11 baseline;
- controls preserve 44px minimum interactive target where applicable.

### Dense
Reserved for data-heavy tables/compact metric surfaces.
- use P11 dense table/card padding only;
- never reduce text below governed typography roles;
- never reduce interactive targets below accessibility constraints;
- density cannot hide labels required for financial comprehension.

## 11. Wide Desktop
At `>=1440px`:
- page padding grows to 40px;
- default content remains capped at 1200px;
- 1280px container requires data-density justification;
- avoid stretching cards solely to fill space;
- supporting rails may become more stable, but primary content hierarchy remains unchanged.

## 12. Known audit resolutions carried forward
This layout architecture directly addresses the layout portion of `AUD-P02-009 / BK-009`:
- sidebar navigation is internally scrollable;
- dashboard/screen designs must establish one primary information hierarchy;
- Desktop page composition must not rely on document-level horizontal scrolling.

Screen-specific hierarchy and table behavior remain owned by UX-P14 and UX-P21 and therefore BK-009 remains open until all target phases complete.

## 13. Phase boundaries
- UX-P14: Desktop core screens.
- UX-P15: Desktop secondary screens.
- UX-P19: responsive transformations and medium range.
- UX-P20: detailed form layout/validation.
- UX-P21: detailed table/data layouts.
- UX-P22: navigation behavior and structure implementation.
- UX-P24: states.
- UX-P26: accessibility certification.
