# Component System — UX-P12

PHASE: UX-P12
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-015

## Governance
This file is the authoritative component-architecture registry. Components consume approved identity, token, typography, iconography and spacing foundations from UX-P07–P11. No screen-specific clone may replace a registered primitive/composite without a governed extension. Detailed form/table behavior remains refined in UX-P20/P21; navigation components in UX-P22; full states in UX-P24; motion in UX-P25; accessibility in UX-P26.

## Architecture principles
1. One semantic component family per interaction concept; variants are properties, not duplicated CSS families.
2. Component API expresses role/state/size; pages do not hardcode visual values.
3. All geometry/colors/type/spacing/icons consume approved tokens and systems.
4. RTL uses logical properties and semantic direction; no physical left/right assumptions.
5. Minimum interactive target is 44px where applicable; visual icon may be smaller inside the target.
6. Meaning never depends on color/icon alone.
7. Destructive actions require explicit semantics and safety treatment; detailed confirmation/undo rules are refined in UX-P23/P24.
8. Desktop and Mobile may compose components differently, but primitive identity remains consistent.

## Layer model
- **Primitives:** Button, Input, Select, Checkbox, Radio, Switch, Badge, Status Chip.
- **Composites:** Search, Date Picker, Table, Filters, Tabs, Upload.
- **Containers:** Card, Modal, Drawer, Bottom Sheet.
- **Feedback:** Toast, Alert.

## Component registry

### CMP-BTN-001 — Button
**Purpose:** execute a user action.
**Variants:** `primary`, `secondary`, `tertiary/ghost`, `destructive` (semantic treatment without new hue), `icon-only`.
**Sizes:** `sm=40px` only for dense non-primary contexts where target can remain >=44px through container; `md=44px` default; `lg=48px`.
**Content:** text; optional Lucide leading/trailing icon; icon-only requires accessible name.
**States required:** DEFAULT, HOVER (pointer), FOCUS, PRESSED, LOADING, DISABLED; SELECTED only when button acts as toggle.
**Rules:** one primary action per local decision context; loading preserves width and prevents duplicate activation; destructive meaning uses copy/icon/confirmation pattern, not red.

### CMP-INP-001 — Text Input
**Purpose:** free-form or constrained textual/numeric data entry.
**Height:** 44px default; multiline Textarea is a variant with content-driven/minimum height.
**Anatomy:** visible label, optional help, control, optional leading/trailing icon/action, validation message.
**Types:** text, email, password, numeric/financial, textarea.
**States required:** DEFAULT, HOVER, FOCUS, FILLED, ERROR, SUCCESS where meaningful, DISABLED, READ_ONLY, LOADING only when dependent.
**Rules:** placeholder is never the only label; financial numeric content follows P09 numeric rules; required/optional status explicit; error text remains adjacent.

### CMP-SEL-001 — Select / Combobox
**Purpose:** choose one/multiple governed options; searchable variant when option set is long.
**Height:** 44px default.
**Variants:** native/simple select; searchable combobox; multi-select only where justified.
**States:** DEFAULT, HOVER, FOCUS, OPEN, SELECTED, NO_RESULTS, ERROR, DISABLED, LOADING.
**Rules:** full keyboard navigation is mandatory; listbox is z-dropdown; creation of a new option must be explicit, never accidental.

### CMP-SRCH-001 — Search
**Purpose:** locate records/options within a defined scope.
**Anatomy:** label or accessible name, search icon, input, clear action when populated, optional scope/filter trigger.
**States:** DEFAULT, FOCUS, TYPING, LOADING, RESULTS, NO_RESULTS, ERROR, DISABLED.
**Rules:** scope must be apparent; no-results explains next action; debounce/technical behavior deferred to implementation.

### CMP-DATE-001 — Date Picker
**Purpose:** enter/select a date or governed date range.
**Anatomy:** input/trigger + calendar icon + calendar surface + navigation + selected date.
**Variants:** single date; range only where business task requires it.
**States:** DEFAULT, FOCUS, OPEN, SELECTED, DISABLED_DATE, ERROR, DISABLED.
**Rules:** manual entry remains possible where feasible; locale is Arabic/RTL while numeric date remains unambiguous; keyboard operation required. Exact date format is finalized with UX writing/forms.

### CMP-CHK-001 — Checkbox
**Purpose:** independent binary/multi-selection choices.
**Target:** >=44px interaction area.
**States:** UNCHECKED, HOVER, FOCUS, CHECKED, INDETERMINATE, DISABLED, ERROR when group validation applies.
**Rules:** label is clickable; do not use for immediate on/off settings where Switch is semantically better.

### CMP-RAD-001 — Radio Group
**Purpose:** select exactly one option from a visible set.
**States:** UNSELECTED, HOVER, FOCUS, SELECTED, DISABLED, ERROR group.
**Rules:** always used as a named group with visible legend/question; keyboard arrow navigation required; use Select when the visible option set would be too long.

### CMP-SWT-001 — Switch
**Purpose:** immediate binary setting.
**States:** OFF, HOVER, FOCUS, PRESSED, ON, DISABLED.
**Rules:** label describes the setting, not an imperative; state remains understandable without color. No use for destructive confirmation or form submission.

### CMP-CARD-001 — Card
**Purpose:** group one coherent information/action unit.
**Variants:** `standard`, `summary`, `actionable`, `financial-metric`, `quiet/flat`.
**Anatomy:** optional heading, primary content, supporting content, optional footer/actions.
**Surface:** white/default surface; restrained border/shadow tokens; radius from approved scale.
**Rules:** whole-card click only when card has one unambiguous destination; avoid nested cards and competing actions; hierarchy uses P09 roles.

### CMP-TBL-001 — Data Table
**Purpose:** compare structured multi-column data on Desktop.
**Anatomy:** caption/title context, header, body, row actions, optional sort/filter/search/pagination/bulk selection.
**States:** DEFAULT, HOVER row, SELECTED row, SORTED, LOADING, SKELETON, EMPTY, NO_RESULTS, ERROR, DISABLED_ACTION.
**Rules:** exact capabilities depend on data task; numeric columns align consistently and use tabular numerals; long content strategy explicit; Mobile transformation is required and finalized in UX-P19/P21 rather than default horizontal scrolling.

### CMP-FLT-001 — Filter Set
**Purpose:** narrow a data set by task-relevant criteria.
**Variants:** inline/Desktop panel; compact/collapsible; Mobile trigger-to-overlay composition.
**Anatomy:** title/trigger, active-count summary, filter controls, Apply when deferred, Clear/Reset.
**States:** DEFAULT, EXPANDED, ACTIVE, DISABLED, LOADING.
**Rules:** active filters remain visible/understandable when panel is collapsed; reset is consistently available; filter state must not be hidden on Mobile.

### CMP-TAB-001 — Tabs
**Purpose:** switch between peer views within the same page context.
**States:** DEFAULT, HOVER, FOCUS, SELECTED, DISABLED.
**Rules:** not a substitute for primary navigation; one selected tab; full keyboard tab semantics; overflow strategy required instead of shrinking labels illegibly.

### CMP-MOD-001 — Modal Dialog
**Purpose:** focused blocking decision/task that must be resolved or dismissed before returning.
**Width:** bounded by approved container/spacing tokens; never full-screen by default on Desktop.
**Anatomy:** title, optional description, content, primary/secondary actions, close where safe, backdrop.
**States:** OPEN, LOADING, ERROR, SUCCESS as task-local state, CLOSING semantics deferred to P25.
**Rules:** focus trap/return required; Escape closes only when safe; unsaved/destructive work requires governed safety behavior; no modal-on-modal.

### CMP-DRW-001 — Drawer
**Purpose:** contextual secondary work/details while retaining awareness of parent context.
**Direction:** opens from the logical inline end/start according to task, never hardcoded physical side.
**Rules:** Desktop-first contextual surface; focus containment required; not used merely to avoid designing a page. On Mobile, use Bottom Sheet/full-page pattern when more appropriate.

### CMP-BS-001 — Bottom Sheet
**Purpose:** Mobile action selection or compact contextual task anchored to the bottom edge.
**Variants:** action sheet; compact form/detail sheet.
**States:** CLOSED/OPEN plus task states.
**Rules:** safe-area aware; touch targets >=44px; drag gesture may supplement but never replace explicit close; destructive items clearly labeled; long complex workflows should become a page rather than an oversized sheet.

### CMP-TST-001 — Toast
**Purpose:** transient non-blocking confirmation/status after an action.
**Variants:** info, success, warning, error semantics using approved palette + icon + text; optional Undo action when reversible.
**Rules:** never sole carrier of critical/financial-risk information; accessible live-region behavior required; user must have enough time to perceive it; exact timing deferred to P23/P25/P26.

### CMP-ALT-001 — Alert
**Purpose:** persistent contextual message that requires awareness and sometimes action.
**Variants:** info, success, warning, error/critical semantics without new hue.
**Anatomy:** Lucide state icon, title/message, optional action.
**Rules:** severity encoded through wording/icon/layout as well as color; financial-risk alerts link to affected context/action; technical backend codes never appear as primary user copy.

### CMP-BDG-001 — Badge
**Purpose:** compact categorical/count metadata.
**Variants:** neutral, accent, count.
**Rules:** not used for mutable workflow status when Status Chip is more appropriate; count badge has accessible equivalent; compact and non-interactive by default.

### CMP-STS-001 — Status Chip
**Purpose:** communicate a record/process state such as active, pending, completed, attention required.
**Anatomy:** text + optional state icon; pill geometry allowed.
**Rules:** status is always textual; color is supplementary only; canonical vocabulary finalized in UX-P27; interactive filtering chips are a different Filter control, not this component.

### CMP-UPL-001 — Upload
**Purpose:** select/submit a supported file/media asset.
**Variants:** file picker; image/profile uploader where product supports it.
**States:** DEFAULT, HOVER/DRAG_OVER where drag-drop exists, SELECTED, UPLOADING, SUCCESS, ERROR, DISABLED.
**Rules:** accepted type/size constraints visible before selection; selected file can be removed/replaced before submit when safe; progress/feedback visible; no reliance on drag-and-drop only; accessible native file trigger retained.

## Cross-component composition rules
- Form fields compose `Label + Control + Help/Error`; P20 owns detailed form orchestration.
- Search/Filter/Table compose as one data-discovery pattern; P21 owns data behavior.
- Modal/Drawer/Bottom Sheet share overlay/focus foundations but remain distinct semantic containers.
- Toast/Alert/Status Chip/Badge are not interchangeable: transient feedback, persistent contextual feedback, workflow state, and metadata respectively.
- Page-level navigation components are intentionally not defined here; UX-P22 owns navigation architecture implementation.

## Component state contract
P12 defines which states a component must support architecturally. UX-P24 defines the final cross-system state treatment. Every future implementation must consider applicable states from DEFAULT, HOVER, FOCUS, PRESSED, SELECTED, LOADING, SKELETON, EMPTY, NO_RESULTS, ERROR, SUCCESS, DISABLED, OFFLINE, PERMISSION_DENIED.

## Token consumption contract
- No raw color values: use P08 semantic/brand tokens.
- No raw spacing/radius/border/shadow/size/z-index values.
- Typography uses P09 semantic roles.
- Icons use P10 Lucide system.
- Layout spacing uses P11 rules.
- Motion is limited to P08 primitives until P25 defines purpose/behavior.

## Duplication prevention
The existing-system pattern of parallel `.primary`, `.primary-button`, `.primary-link`, `.p47-primary-action` families is explicitly deprecated as an architectural pattern. Future UI uses `CMP-BTN-001` variants. The same rule applies to duplicated feedback, field and action-row families.

## Acceptance summary
- All 20 registered P12 component families have one authoritative semantic definition.
- Dependencies and future refinement boundaries are explicit.
- No unauthorized color/font/decorative system is introduced.
- Desktop/Mobile composition differences are allowed without duplicating primitive identity.
- Component architecture resolves the duplication root cause identified in UX-P02/P06 at the specification level.
