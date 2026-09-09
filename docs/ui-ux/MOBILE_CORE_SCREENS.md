# Mobile Core Screens — UX-P17

PHASE: UX-P17
STATUS: APPROVED
DECISION: DEC-UI-020
DEVICE: DV-MOBILE

## Purpose
This document is the authoritative Mobile core-screen composition specification for the personal-finance product. It consumes UX-P01–P16 and preserves detailed responsive/forms/tables/navigation/feedback/states/motion/accessibility/writing ownership for UX-P19–P27.

## Governing mobile principle
Mobile is decision-first and task-focused. The user should be able to understand the most important current financial signal, act quickly with one hand, and move from alert/context to corrective action without reproducing Desktop density.

---

## S01 — Mobile Dashboard — PG-HOME-001 `/dashboard`
### Primary hierarchy
1. **وضعك الآن** — one dominant financial-position summary, freshness context, and the most meaningful current change.
2. **ما يحتاج انتباهك** — highest-priority risk/obligation/exception, ordered by urgency and financial impact.
3. **الإجراء الأقرب** — one clear corrective/next action derived from context; Quick Add remains a navigation utility, not a competing hero action.
4. **الخطة والتقدم** — concise goal/debt/plan progress with drill-in.
5. **الحركة الأخيرة** — prioritized recent activity list; no wide desktop table.

### Layout
- One-column default on the 4-column mobile grid.
- Compact peer metrics may use 2+2 only when labels/values remain fully readable.
- No nested horizontal scrolling.
- Global bottom navigation remains available where appropriate; content reserves its height and safe area.

### Actions
- Primary: highest-value contextual next action.
- Secondary: quick add, open all alerts, open transaction history, open goal/plan details.
- Destructive: none at Dashboard level.

### States
DEFAULT, LOADING/SKELETON, EMPTY/new-account setup, ERROR/retry, OFFLINE placeholder, stale-data/freshness context. Empty does not show meaningless zero cards.

---

## S02 — Mobile Main List — PG-TRANS-001 `/transactions`
### Purpose
Allow the owner to trace financial activity quickly on a phone without desktop-table compression.

### Mobile representation
- Default: **record cards/prioritized rows**, not a horizontally scrolling table.
- Row hierarchy: amount → description/merchant → date/status → category/account → contextual action.
- Amount uses approved numeric role and bidi isolation.
- Search/filter summary remains above results and visible when criteria are active.

### Actions
- Primary: add a financial record via the approved quick-add/create entry.
- Row: open details/context; edit/delete only through explicit row overflow/context controls.
- Destructive actions never sit beside the main tap target without separation.

### States
LOADING/SKELETON, EMPTY, NO_RESULTS, ERROR, FILTERED, SELECTED/contextual. Detailed sort/pagination/data contracts remain P21.

---

## S03 — Mobile Details
### Governance boundary
No new standalone detail route is invented. This is the canonical mobile financial-record detail composition rendered in an existing context or future governed route.

### Hierarchy
- Primary: amount/value + record identity + current status.
- Secondary: date, category, account/source-destination, goal/obligation relationship.
- Supporting: notes, source metadata, related records.

### Layout/actions
- One vertical reading flow; sections use progressive disclosure when secondary data is long.
- Primary: edit/correct where applicable.
- Secondary: return to originating context; related-record navigation.
- Delete is separated and requires later P23/P24 safety behavior.

### States
DEFAULT, LOADING, ERROR, unavailable/deleted entity. No speculative permission/admin state is introduced beyond current role model.

---

## S04 — Mobile Create — PG-EXPENSE-001 / PG-INCOME-001 / PG-TRANSFER-001 / PG-REFUND-001
### Flow
1. Confirm record type/context.
2. Enter essential amount/date/source information.
3. Add optional details progressively.
4. Validate in-place.
5. Review material financial impact when relevant.
6. Submit with pending protection and success feedback.

### Layout
- Full-page focused task for substantive financial records; Bottom Sheet may only select the record type or a compact option.
- Single-column fields only by default.
- Primary submit near natural thumb reach at flow end; sticky only when it improves continuity and never collides with bottom navigation/keyboard.
- Cancel/back is secondary; no destructive action in Create.

### States
DEFAULT, FOCUS, VALIDATION_ERROR, SUBMITTING/DISABLED, SUCCESS, SYSTEM_ERROR, CANCEL. Detailed field contracts remain P20.

---

## S05 — Mobile Edit
### Purpose
Modify an existing record while preserving current context and preventing accidental loss.

### Structure
- Explicit “editing” context and current values prefilled.
- Changed values remain distinguishable by context, not decorative color alone.
- Save is the single primary action; cancel/back secondary.
- Delete, where permitted, is spatially separated from Save.
- Unsaved-change protection is carried to P20/P23/P24 for final behavior.

### Layout
Same single-column architecture as Create to preserve learned behavior. No desktop 2-column field groups on phones.

---

## S06 — Mobile Approval
**NOT APPLICABLE.**

DEC-UX-011 defines one Individual Account Owner and no Approver/approval tier. No approval screen/status/action is introduced. Future approval roles require governed scope change.

---

## S07 — Mobile Search
### Model
Search remains contextual to lists/modules; no unapproved global `/search` route is introduced.

### Layout/behavior
- Search control occupies a full-width mobile field when active.
- Active filters are represented visibly by count/summary/chips when the filter panel/sheet is closed.
- Advanced filtering may open `CMP-BS-001` Bottom Sheet; applying criteria returns to the results context.
- Query and selected filters remain persistent while opening/returning from a result within the same journey.

### States
SEARCHING, RESULTS, NO_RESULTS, ERROR, CLEARED/DEFAULT. NO_RESULTS offers clear/adjust criteria rather than a dead end.

---

## S08 — Mobile Reports — PG-REPORT-001 `/reports`
### Principle
Reports answer a financial question; charts are supporting evidence, not the page purpose.

### Hierarchy
1. Report question/period.
2. Plain-language primary insight.
3. Key numeric evidence.
4. Mobile-appropriate chart or breakdown.
5. Drill-down to underlying transactions/categories.

### Mobile composition
- One-column sequence by default.
- Short comparable metrics may use 2+2 cards where readable.
- Wide analytical comparison may use a justified contained overflow only when no meaningful mobile transformation exists; it never causes page-level horizontal scroll.
- Charts require textual/numeric equivalents; final accessibility remains P26.

### States
LOADING/SKELETON, EMPTY/insufficient data, ERROR, DEFAULT, FILTERED PERIOD, NO_COMPARABLE_HISTORY.

---

## Cross-screen mobile hierarchy map
| Screen | Primary information | Primary action |
|---|---|---|
| Dashboard | Current position + highest-priority attention | Contextual next/corrective action |
| Main List | Traceable activity cards/list | Add financial record |
| Details | One record's financial meaning | Edit/correct if applicable |
| Create | Essential financial inputs + impact context | Save/create |
| Edit | Current values + intended changes | Save changes |
| Approval | N/A | N/A |
| Search | Matching records + active criteria | Context action on result |
| Reports | Insight + evidence | Context dependent; may have no dominant action |

## One-hand and reach rules
- High-frequency Add/Continue/Save actions appear in reachable lower-flow positions where task semantics allow.
- Risk context may surface at the top for visibility; the corrective action remains reachable in content flow.
- Icon-only utilities remain >=44x44px with accessible names.
- Destructive actions are separated from high-frequency thumb zones where accidental activation is likely.

## RTL and financial data
- Logical properties and Arabic reading order govern layout.
- Directional arrows follow UX-P10 semantics; non-directional icons do not mirror mechanically.
- Financial numbers use P09 tabular/bidi rules.

## Resolved audit scope
This phase resolves the **core-screen composition portions** of `AUD-P02-010 / BK-010` and `AUD-P02-011 / BK-011`: core phone forms are single-column, data uses mobile alternatives, action clusters do not require horizontal scrolling, and Dashboard hierarchy is phone-specific rather than desktop-scaled.

## Phase boundaries
- P18: Mobile secondary screens.
- P19: exact responsive transformations and medium range.
- P20: form/input behavior and validation contracts.
- P21: detailed table/data sorting/filtering/pagination behavior.
- P22: final navigation destinations/behavior.
- P23/P24: notification/feedback/state-system details.
- P25: motion.
- P26: accessibility certification.
- P27: final UX writing.
