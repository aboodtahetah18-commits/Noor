# Desktop Core Screens — UX-P14

PHASE: UX-P14
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-017
DEVICE: DV-DESKTOP

## Governance
This file is the authoritative Desktop core-screen composition specification. It consumes the approved UX-P01–P13 product, IA, journey, priority, identity, token, typography, iconography, grid, component and Desktop layout decisions. It does not change approved routes, introduce new roles, or replace later detailed form/table/navigation/state/accessibility phases.

## Common core-screen rules
Every core Desktop screen must explicitly define Primary Information, Secondary Information, Supporting Information, Primary Action, Secondary Action and any Destructive Action. Only one action may be visually dominant in the immediate page context.

All screens:
- use the P13 RTL Desktop shell and governed 12-column grid;
- use P08–P12 tokens/components only;
- use IBM Plex Sans Arabic and Lucide only;
- avoid document-level horizontal scrolling;
- preserve account-scoped privacy and one-owner role model;
- expose state meaning with text/icon/structure, never color alone;
- reserve exact validation, table behavior, navigation implementation, complete state contracts and accessibility certification for P20/P21/P22/P24/P26.

---

## S01 — Dashboard — PG-HOME-001 `/dashboard`
### Screen purpose
Answer, in one scan: **What is my financial position now, what requires attention, and what should I do next?** The Dashboard is a financial command center, not a catalogue of every module.

### Hierarchy
1. **Primary Information — الوضع المالي الآن**: consolidated position, current cash-flow direction, and one concise health/risk statement.
2. **Priority Attention — ما يحتاج انتباهك**: maximum high-value risks/alerts needing action; ordered by urgency and financial consequence.
3. **Plan Progress — الخطة والتقدم**: debts/obligations/goals summarized as progress, not full management surfaces.
4. **Supporting Trends — الحركة الأخيرة**: recent money-flow/trend context sufficient to explain change.
5. **Module entry points**: secondary links to detailed management areas; they must not visually compete with the primary hierarchy.

### Actions
- Primary: the single contextually highest-value next action derived from the current financial state (e.g. review a risk / correct a plan gap); generic “add” is not always primary.
- Secondary: quick financial entry, view all alerts, open detailed activity.
- Destructive: none at Dashboard level.

### Layout
- Page header: 12/12.
- Financial position block: 8 columns; priority-attention rail: 4 columns when enough content exists.
- Progress summaries: 3 peer cards in a governed 4/4/4 row only when equal priority; otherwise 8/4.
- Recent activity/trend region: 8 columns with 4-column supporting explanation or full 12 when data density requires.
- Comfortable density by default.

### State requirements
DEFAULT, LOADING/SKELETON, EMPTY (new account), ERROR, OFFLINE placeholder for future P24/P19 implementation, and data-freshness context. Empty Dashboard guides setup rather than showing zero-filled meaningless cards.

### Audit resolution
This composition resolves the **Dashboard hierarchy** portion of `AUD-P02-009 / BK-009` by enforcing one clear information sequence rather than parallel hero/KPI/module layers.

---

## S02 — Main List — PG-TRANS-001 `/transactions`
### Screen purpose
Provide the canonical Desktop operational list for tracing where money came from and where every riyal went. Other list-heavy money modules may reuse this screen composition without creating a second list architecture.

### Hierarchy
- Primary Information: financial activity list + total/context for the active period.
- Secondary: search/filter summary and selected period/account context.
- Supporting: count, result metadata, category/account labels.

### Actions
- Primary: add a financial record (using the appropriate creation choice).
- Secondary: search, filter, export only if/when approved in later scope; no unapproved export feature is introduced here.
- Row actions: view/details, edit, delete where supported; remain local to the row.

### Layout
- Header 12/12.
- Filter/search area directly above list and tied to it.
- Table region uses the wide/data-dense container only when justified.
- Optional selected-record context may use P13 8/4 details composition; otherwise full-width table.
- Dense mode allowed only for the data region; header/filters remain Standard.

### Table information priority
Date/time → description/merchant → category/context → account/source → amount → status/action. Amount receives strong numeric treatment with tabular figures. Long content must not force document overflow.

### States
LOADING/SKELETON, EMPTY, NO_RESULTS, ERROR, SELECTED row/context, filtered-state summary. Exact sorting/pagination/bulk-action rules remain P21.

---

## S03 — Details Page / Detail Context
### Governance boundary
No new detail route is registered in the approved IA/current route inventory. P14 therefore approves a **canonical Desktop financial-record detail composition** without inventing a new route. It may be rendered through an existing page context, a P13 details panel, or a future governed route decision.

### Purpose
Explain one financial record/entity completely enough to support an informed edit/corrective decision while preserving provenance and financial context.

### Hierarchy
- Primary: entity identity + amount/value + current status.
- Secondary: date, category, source/destination, obligation/goal relationship where applicable.
- Supporting: notes, audit/source metadata, related records, explanatory context.

### Actions
- Primary: edit/correct record when editable.
- Secondary: back/return to source context, related item navigation.
- Destructive: delete separated from primary controls and always requires later P23/P24 safety treatment.

### Layout
- Standard: 8-column primary detail + 4-column contextual rail.
- Long explanatory content uses reading width inside the 8-column region.
- Dense raw metadata must not precede the user-facing financial meaning.

### States
DEFAULT, LOADING, ERROR, unavailable/deleted entity, permission boundary (future system contract). No unregistered admin behavior.

---

## S04 — Create Flow — PG-EXPENSE-001 / PG-INCOME-001 / PG-TRANSFER-001 / PG-REFUND-001
### Purpose
Create a financial record with minimum necessary typing, strong context and clear confirmation of what will change financially.

### Shared structure
1. Identify record type/context.
2. Enter essential financial data.
3. Add optional supporting context progressively.
4. Validate before commit.
5. Submit with pending protection.
6. Confirm success and show the new financial state/next action.

### Desktop composition
- Focused form container (`--ux-container-form`).
- One-column reading/order by default; two-column grouping only for short, semantically paired fields and never to compress labels.
- Summary/impact preview may occupy a supporting 4-column rail only when it adds decision value; otherwise the form remains centered.
- Primary Submit at form end; Cancel/Back secondary. No destructive action in create.

### Record-specific intent
- Expense: amount, date, category/merchant/account context.
- Income: amount, date, source/account context.
- Transfer: amount + explicit source and destination with reversal-awareness.
- Refund: amount + related source/transaction context when supported.

### States
DEFAULT, FOCUS, VALIDATION ERROR, SUBMITTING/DISABLED, SUCCESS, SYSTEM ERROR, CANCEL. Detailed field validation contracts remain P20.

---

## S05 — Edit Flow
### Purpose
Modify an existing financial record without obscuring its current value, change consequence or unsaved state.

### Structure
- Load current record and show editable context.
- Preserve unchanged values; do not force re-entry.
- Visibly distinguish editing from creating.
- Validate changed fields before commit.
- On success, return to the originating detail/list context with explicit feedback.

### Actions
- Primary: save changes.
- Secondary: cancel/back without committing.
- Destructive delete: separated from Save and never styled as a peer primary action.

### Safety
Unsaved edits must not silently disappear when closing/navigating once P20/P23/P24 implement the behavior. This screen specification carries forward `AUD-P02-002` without prematurely defining the final confirmation mechanism.

### Layout
Same focused form architecture as Create to preserve learned behavior; contextual current-state summary may occupy supporting rail when useful.

---

## S06 — Approval Flow
**Status: NOT APPLICABLE in current product scope.**

Reason:
- DEC-UX-011 and the approved UX-P03 role matrix define only one Individual Account Owner.
- There is no Approver, maker/checker, admin approval tier or cross-account authority.
- UX-P05 already defines approval journey as N/A.

Governance rule: no approval screen, status or component may be invented in P14. If a future role/approval requirement is introduced, it requires governed scope change and revalidation of affected closed phases.

---

## S07 — Search Results
### Governance boundary
No standalone global `/search` route is approved. P14 defines the canonical **Desktop search-result state inside the controlling list/context**, primarily PG-TRANS-001 and other searchable lists.

### Hierarchy
- Search query / active criteria clearly visible.
- Result count and active filters visible before results.
- Result list/table remains the primary information.
- Suggested correction/reset appears when no results exist.

### Actions
- Primary while results exist: context action on selected result, not a generic “search” button.
- Secondary: clear query, reset filters, adjust filters.

### States
SEARCHING, RESULTS, NO_RESULTS, ERROR, CLEARED/DEFAULT. Active-filter state cannot be hidden behind a collapsed control on Desktop.

### Layout
Search and high-value filters occupy the filter area immediately above results; advanced criteria move to secondary row/panel rather than creating a long horizontal toolbar.

---

## S08 — Core Reports — PG-REPORT-001 `/reports`
### Purpose
Turn financial history into understandable evidence for decisions; reports do not exist merely to display charts.

### Hierarchy
1. Report question/context and period.
2. Primary insight/summary in plain language.
3. Key numeric evidence.
4. Chart/table evidence explaining the insight.
5. Supporting breakdowns and drill-down links.

### Actions
- Primary: change the report context only when necessary to answer the current question; otherwise no artificial dominant action.
- Secondary: period/filter controls and drill-down into underlying transactions/categories.
- Export/print is not introduced unless approved in later product scope.

### Layout
- Page header 12/12.
- Report controls directly below header.
- Insight summary 12/12 or 8/4 when a supporting metric rail adds value.
- Evidence visualization: 8 columns; breakdown/table: 4 columns when comparable, otherwise stacked 12/12.
- Dense tables use governed data container without stretching narrative text.

### States
LOADING/SKELETON, EMPTY (insufficient data with setup guidance), ERROR, DEFAULT, filtered period, no comparable history. Charts must retain textual/numeric equivalents; final chart accessibility belongs to P26.

---

## Cross-screen primary hierarchy map
| Screen | Primary information | Primary action |
|---|---|---|
| Dashboard | Current financial position + priority attention | Highest-value corrective/next action |
| Main List | Traceable financial activity | Add financial record |
| Detail Context | One entity's financial meaning/current state | Edit/correct if applicable |
| Create | Required financial inputs + impact context | Save/create |
| Edit | Current values + intended changes | Save changes |
| Approval | N/A | N/A |
| Search Results | Matching records + active criteria | Context action on selected result |
| Reports | Insight + evidence | Context-dependent; may intentionally have no dominant action |

## Phase boundary
P14 specifies Desktop core screens only. P15 owns secondary Desktop screens; P20 detailed forms, P21 tables/data, P22 navigation, P23 feedback, P24 complete states, P25 motion, P26 accessibility, and P27 final UX writing remain authoritative for their concerns.
