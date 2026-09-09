# Mobile Secondary Screens — UX-P18

PHASE: UX-P18
STATUS: APPROVED
DECISION: DEC-UI-021
DEVICE: DV-MOBILE

## Purpose
This document is the authoritative Mobile secondary-screen composition specification for the personal-finance product. It consumes UX-P01–P17 and keeps responsive/forms/tables/navigation/feedback/states/motion/accessibility/writing ownership in UX-P19–P27.

## Governing principle
Secondary mobile surfaces support the financial decision journey without competing with the four primary IA modules. They are phone-native, one-hand aware, RTL-first and reuse the P16 shell/P12 component system instead of creating a second visual language.

---

## S01 — Mobile Settings — PG-SETTINGS-001 `/settings`
### Purpose
Let the Individual Account Owner manage account/profile and presentation preferences without exposing system-administration concepts.

### Hierarchy
1. Account identity/profile context.
2. Locale/presentation preferences supported by the product.
3. Access/security account actions supported today.
4. Secondary product/settings information.

### Mobile composition
- Single-column grouped sections using cards/list groups only when grouping improves scanability.
- No persistent Desktop section rail; section navigation becomes inline anchors or progressive disclosure if the list grows.
- Each settings group owns its own Save/autosave state; no fake global Save if the underlying behavior is autosave.
- Destructive account actions, if ever supported, are isolated at the end and never adjacent to routine Save/Back actions.
- Keyboard-safe bottom spacing and >=44px interactive targets are mandatory.

### States
DEFAULT, CHANGED, SAVING, SUCCESS, ERROR, DISABLED where applicable. Final feedback contracts remain P23/P24.

---

## S02 — Mobile Notifications — PG-ALERT-001 `/alerts`
### Purpose
Present financial alerts as an actionable attention queue, not a generic notification inbox.

### Hierarchy
1. Needs action now.
2. Needs review soon.
3. Informational/resolved history.

Each alert communicates: what changed → why it matters → affected financial context → next action. Severity is never color-only.

### Mobile composition
- One-column alert cards/rows with urgency and context readable before opening details.
- Filter/status controls use compact chips or a Bottom Sheet when criteria exceed available width; no horizontally scrolling action row as the primary pattern.
- Opening an alert keeps return context and routes to the affected financial surface/corrective flow.
- Read/unread and notification-delivery semantics remain P23; P18 only reserves their composition slots.

### States
LOADING/SKELETON, EMPTY, ERROR, NO_RESULTS, ACTIVE, RESOLVED, SELECTED/contextual.

---

## S03 — Mobile Activity Log — supporting composition within PG-SYSTEM-001 `/workspace`
### Governance boundary
No standalone `/activity` route is introduced. The activity history remains a read-only supporting composition inside the existing Workspace/System surface when such data exists.

### Mobile hierarchy
Event meaning → time → affected area → result/status → optional reference/detail.

### Mobile composition
- Chronological list/timeline cards, not a compressed Desktop table.
- Technical payloads are collapsed by default; user-facing meaning appears first.
- Filter controls stay compact and may use a Bottom Sheet.
- Empty state explains that no relevant activity is available.
- This surface must not duplicate the financial transaction ledger.

---

## S04 — Mobile Archive
**NO STANDALONE ARCHIVE SCREEN APPROVED.**

No registered `/archive` route or product requirement exists. Historical/resolved records remain inside their owning modules through status/history/filter patterns. Mobile must not create a generic archive destination merely to satisfy a screen checklist.

---

## S05 — Mobile Secondary Flows
Secondary/rare flows reuse the same mobile shell, components and identity.

### Governed flows
1. **Onboarding continuation — PG-ONBOARD-001**: focused full-page task shell; app navigation is withheld until the user reaches an appropriate authenticated product context.
2. **Profile/account credential changes**: settings/profile surfaces with one-column forms, keyboard-safe actions and later P23/P24 pending/success/error behavior.
3. **Global error/retry**: plain-language problem summary, Retry as the primary recovery action, and safe return to Dashboard/System context.
4. **Session/access interruption**: return to authentication without exposing cached sensitive content; preserve safe intended destination when technically appropriate.
5. **Unavailable/deleted entity**: explain unavailability and return to owning list/context; no raw 404/backend terminology.
6. **Contextual help**: inline/supporting help in the owning surface. No standalone Help Center route is introduced.
7. **Secondary report states**: remain inside PG-REPORT-001 and inherit P17 insight-first mobile composition.
8. **Future offline/sync state**: composition placeholder only. Exact sync/conflict behavior is not invented here and remains owned by P19/P23/P24 plus technical implementation governance.

### Mobile behavior
- Short choices/confirmations may use Bottom Sheets; substantive tasks use full-page focused flows.
- Recovery action is visually dominant over technical diagnosis.
- No rare flow introduces a new color system, icon family, arbitrary spacing or device-specific component clone.

---

## Cross-screen hierarchy map
| Surface | Primary information | Primary action |
|---|---|---|
| Settings | Current account/settings group | Save current change when explicit commit exists |
| Notifications | Highest-priority actionable financial alert | Open/correct affected context |
| Activity Log / Workspace | Meaningful account/system event | Usually inspect/recover context |
| Archive | No standalone screen | N/A |
| Secondary/Rare flows | What happened / what the user must do next | Continue / retry / recover / save |

## One-hand, RTL and privacy rules
- High-frequency actions remain in reachable content-flow positions and never collide with bottom navigation or the software keyboard.
- Directional icons follow P10 RTL semantics; layout uses logical properties.
- Financial values keep P09 tabular/bidi treatment.
- Sensitive financial/account content must not be unnecessarily repeated in persistent chrome, snackbars or lock-screen-like surfaces; notification privacy details remain P23/P26.

## Resolved audit scope
P18 completes the **secondary-screen mobile composition** portion of the Mobile consistency work identified in UX-P02/P06 by preventing Desktop tables/rails/action rows from being mechanically carried to phone layouts and by defining phone-native settings, alert and activity patterns.

## Phase boundaries
- P19: exact responsive transformations and medium-range behavior.
- P20: detailed form/input contracts.
- P21: detailed data/list/table behavior.
- P22: final navigation destinations/behavior.
- P23/P24: notification feedback and complete state contracts.
- P25: motion.
- P26: accessibility certification.
- P27: final UX writing.
