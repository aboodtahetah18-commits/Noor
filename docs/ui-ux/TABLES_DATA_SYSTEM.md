# Tables & Data System — UX-P21

PHASE: UX-P21
STATUS: APPROVED
DECISION: DEC-UI-024
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
This document is the authoritative data-display and table-interaction contract for the personal financial advisor. It turns financial records into decision-support surfaces while consuming P08–P20 foundations and preserving navigation/feedback/state/accessibility specialization for P22–P26.

## Core principles
1. Every table/list starts from user task priority, not database-field order.
2. Financial identity + amount + time/state are the dominant scan anchors.
3. Sorting/filtering/searching must be discoverable, reversible and preserve user context.
4. Row actions are contextual; destructive actions never masquerade as ordinary navigation.
5. Bulk actions exist only where the same action is safe and meaningful for multiple records.
6. Empty/loading/error are first-class data states, never blank table shells.
7. Mobile transforms the information architecture; horizontal page scroll is not the primary pattern.
8. Amounts use P09 numeric roles, tabular numerals and stable bidi isolation.
9. Dense tables remain readable; density never reduces touch targets, focus visibility or semantic clarity.

## UX-P21-S01 — Column hierarchy
Canonical Desktop priority groups:
- **Primary identity**: record/person/account/category/title that answers “what is this?”.
- **Primary financial value**: amount/balance/value; aligned consistently and formatted by currency semantics.
- **Temporal context**: transaction/effective/due date where it changes decision-making.
- **State/risk**: status, severity, progress or overdue state.
- **Secondary context**: account, merchant, category, note, source/destination.
- **Actions**: final logical-end column; not mixed into financial values.

Rules:
- Maximum visible columns are selected by task; low-priority metadata moves to detail/expansion rather than forcing width.
- Primary columns must remain understandable without relying on color.
- Column headers use P09 table-header role; amounts use numeric roles and `tabular-nums`.
- Long notes/descriptions do not define base table width; truncate/wrap per task and expose full value accessibly.
- Horizontal scroll may exist inside a bounded specialist data region on Desktop only when content is genuinely non-reducible; it must never create page-level overflow.

## UX-P21-S02 — Row density
Density intents consume P13: `Comfortable / Standard / Dense`.

Rules:
- Standard is default for financial record lists.
- Comfortable is preferred for review/decision surfaces and mixed content.
- Dense is reserved for high-volume expert scanning and cannot reduce interactive target below 44px.
- Row height is driven by one-line/secondary-line content, not arbitrary fixed compression.
- Zebra striping is not required; separation uses governed borders/surfaces and hover/focus/selected states.
- Row selection, hover and keyboard focus are visually distinct states.

## UX-P21-S03 — Sorting
Sorting contract:
- Sortable headers expose button semantics and current direction programmatically (`aria-sort` or equivalent).
- One obvious default sort is selected by task, e.g. newest-first for transactions, nearest/most urgent for due/risk queues.
- Amount/date/status columns are sortable only when the ordering is meaningful.
- Toggle sequence is explicit: ascending ↔ descending; optional “default” reset belongs to reset controls.
- Sorting preserves active search/filter state and page context where technically appropriate.
- Mobile sorting moves to a compact Sort control rather than tiny sortable headers.

## UX-P21-S04 — Filtering
Filtering contract:
- Filters map to real decision dimensions: date range, transaction type, category/account, status/risk, amount range where useful.
- Active filters are always visible as a summary/count when the panel is collapsed.
- `مسح الفلاتر` resets filters without clearing unrelated search unless the user chooses a full reset.
- Filter changes announce/update result count without losing context.
- Applied values persist while navigating within the same list/detail flow when practical.
- Mobile uses a Bottom Sheet/Full-page filter composition from P16/P19 based on complexity.

This completes the active-filter-summary portion of `AUD-P02-004 / BK-004` from the data-system side; accessibility certification remains P26.

## UX-P21-S05 — Searching
Search contract:
- Search is contextual to the current dataset, not a speculative global search.
- Visible label/accessible name states what can be searched.
- Debounce may be used, but typing must not block the UI.
- Search preserves filters/sort unless explicitly reset.
- `NO_RESULTS` differs from `EMPTY`: no-results provides query/filter recovery; empty explains absence of records and may offer creation/import where applicable.
- Search terms are not silently corrected into a different financial meaning.
- Mobile keeps search near the list and may expand from a compact control without hiding active filters.

## UX-P21-S06 — Pagination
Pagination contract:
- Pagination is used for datasets large enough to justify server/client chunking; short lists do not show ceremonial pagination.
- Current page and total context are communicated when known.
- Page size is system-governed; a user selector is added only when it solves a real high-volume task.
- Changing filters/search returns to the first valid page unless a stable cursor strategy preserves position safely.
- Previous/next controls remain >=44px and keyboard accessible.
- Mobile favors Previous/Next or progressive loading patterns where numeric page strips become cramped; infinite scrolling is not assumed by default.
- Loading the next page preserves previous data until replacement is authoritative unless the interaction intentionally uses a skeleton region.

## UX-P21-S07 — Bulk actions
Bulk selection is **not default** for all financial lists.

Allowed when:
- the same action is semantically valid for multiple selected records,
- the action is reversible or has an appropriate safety/confirmation pattern,
- selection state can be clearly communicated.

Contract:
- Selection mode is explicit and shows selected count.
- Header checkbox/select-all behavior must clarify current page vs entire result set.
- Bulk action bar appears only after selection.
- Destructive bulk actions are visually/semantically separated and defer confirmation/Undo feedback behavior to P23/P24.
- Bulk edit is prohibited when records require individual financial judgment.
- Mobile bulk actions use a sticky contextual action bar/Bottom Sheet without obscuring content or system navigation.

## UX-P21-S08 — Row actions
Row action hierarchy:
1. Row/primary identity opens the canonical detail context.
2. One frequent secondary action may be visible when justified.
3. Low-frequency actions live in an overflow/menu control.
4. Destructive action is labelled explicitly and separated from normal actions.

Rules:
- Icon-only row actions require accessible names.
- Action controls do not make the entire row semantically ambiguous.
- Keyboard users can reach row actions in a predictable order.
- Mobile record cards expose only the highest-value action(s); the remainder use a governed contextual menu/sheet.
- Deletion confirmation/Undo behavior belongs to P23/P24; P21 only defines placement/hierarchy.

## UX-P21-S09 — Empty tables
Canonical states:
- **EMPTY**: dataset has no records yet. Explain what belongs here and provide a relevant next action when available.
- **NO_RESULTS**: data exists but current search/filters return none. Show active constraint context + clear/reset action.
- **LOADING/SKELETON**: preserve table/card geometry without fake financial values.
- **ERROR**: explain failure in user language, preserve query/filter context and expose Retry where recoverable.
- **OFFLINE**: reserved for later sync/offline implementation; must not imply cloud freshness when data may be local.

Blank `<tbody>` with no explanation is prohibited.

## UX-P21-S10 — Mobile transformation
Mobile does not render a compressed Desktop table by default.

Transformation priority:
1. Preserve record identity.
2. Preserve primary amount/value.
3. Preserve date/state that affects decision.
4. Move secondary metadata into a second line/detail disclosure.
5. Keep one primary action visible; move secondary actions to contextual menu/sheet.

Approved mobile patterns:
- Record Card list for transactions/activity.
- Key/Value list for small comparison sets.
- Prioritized list/timeline for alerts/activity history.
- Compact two-column comparison only when values remain readable without horizontal page scroll.

Manual plan specifically:
- Items become mobile plan cards/list rows with name, planned amount, optional progress/state and contextual edit/delete actions.
- Sorting/prioritization is available through mobile Sort control where meaningful.
- Horizontal scrolling of the Desktop plan table is not the target Mobile behavior.

This resolves the table/data representation portions of `AUD-P02-003`, `AUD-P02-009` and `AUD-P02-011`.

## Financial formatting rules
- Currency symbol/code stays consistently associated with the value.
- Decimal precision follows the financial concept; avoid false precision.
- Negative/positive semantics use text/sign/icon/state treatment, never color alone.
- Percentages include `%`; dates use one governed locale format per surface.
- Missing value is `—`/explicit unavailable semantics, never zero unless zero is factually correct.
- Totals/subtotals are visually distinct but consume existing Typography/Token roles.

## Accessibility baseline for later certification
- Native table semantics for true tabular Desktop data.
- Header associations remain programmatic.
- Sort state exposed programmatically.
- Selection state and row-action names are explicit.
- Focus remains visible in scrolling regions.
- Mobile transformed cards preserve accessible labels and logical reading order.
- Full accessibility audit remains UX-P26.

## Phase boundaries
- P22 owns final navigation behavior.
- P23 owns confirmation, Undo, Toast/feedback and destructive-action feedback.
- P24 owns exhaustive interaction/data states.
- P26 owns accessibility certification.
- P27 owns final microcopy.
