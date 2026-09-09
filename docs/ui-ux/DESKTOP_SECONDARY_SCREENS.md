# Desktop Secondary Screens — UX-P15

PHASE: UX-P15
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-018
DEVICE: DV-DESKTOP

## Governance
This file is the authoritative Desktop secondary-screen composition specification. It consumes UX-P01–P14 decisions and does not introduce unapproved roles, routes, visual values or product capabilities. Secondary screens support the financial experience; they must not visually compete with the four primary IA modules.

## Common secondary-screen rules
- Use the UX-P13 RTL Desktop shell and P08–P12 token/component foundations.
- Secondary pages default to Standard or Comfortable density; Dense is reserved for evidence/history tables.
- Primary information must answer the page's support task before exposing advanced settings or technical metadata.
- One visually dominant action maximum per immediate context.
- Technical/system wording is translated into user-facing meaning; final wording remains UX-P27.
- Complete notification behavior, state contracts and accessibility remain UX-P23/P24/P26.
- No new route is created in P15 unless already registered and verified.

---

## S01 — Settings — PG-SETTINGS-001 `/settings`
### Purpose
Let the account owner control personal/account presentation settings without mixing financial operations or system administration into the page.

### Hierarchy
1. Account identity and profile context.
2. Locale/presentation context such as Arabic and SAR where currently supported.
3. Access/security account actions supported by the current product.
4. Secondary preferences and product information.

### Layout
- Page header: 12/12.
- Settings groups use a 4-column section index/context rail + 8-column settings content when the number of groups justifies it; otherwise a centered standard content column.
- Forms use the P14/P20 focused form pattern; destructive account actions, if ever supported, remain visually isolated.
- Sticky section navigation may be used only with the P13 governed top offset, not the legacy arbitrary 96px offset.

### Actions
- Primary: save only when the current settings surface contains an explicit commit model; autosaved settings show status rather than a fake global Save.
- Secondary: cancel/revert for edited groups when supported.
- Destructive: separated and never adjacent as a peer to primary Save.

### States
DEFAULT, DIRTY/CHANGED, SAVING, SUCCESS, ERROR, DISABLED where applicable. Detailed feedback/state implementation remains P23/P24.

---

## S02 — User Management
**Status: NOT APPLICABLE as a standalone Desktop screen in the current product scope.**

Reason:
- DEC-UX-011 defines one Individual Account Owner only.
- There is no admin, member list, invitation, delegation, approver or cross-account role.
- Profile/account editing belongs to PG-SETTINGS-001 and the existing profile dialog, not to a fabricated user-management area.

Governance rule: future multi-user/team/family/advisor roles require governed scope change and revalidation of UX-P03/P04/P05 and affected downstream phases.

---

## S03 — Activity Log — supporting composition within PG-SYSTEM-001 `/workspace`
### Governance boundary
No standalone activity-log route is registered. P15 therefore defines a read-only **account/system activity history composition** inside the registered System Workspace when such events are available; it does not invent an admin audit product.

### Purpose
Help the owner understand meaningful system/account events relevant to their own account, especially after an error, sync event or account change.

### Information priority
Event meaning → time → affected area → result/status → optional reference/detail. Raw infrastructure payloads are supporting metadata only and hidden by default.

### Layout
- Standard page header followed by filter/context row.
- History uses a readable list/table depending density; dense metadata may use a detail drawer/panel without document-level horizontal scrolling.
- Empty state explains that no relevant activity is available rather than showing an empty technical table.

### Safety
Read-only by default. It is not a financial transaction ledger and must not duplicate PG-TRANS-001.

---

## S04 — Notifications — PG-ALERT-001 `/alerts`
### Purpose
Present financial alerts as an actionable risk/attention queue, not a generic notification inbox.

### Hierarchy
1. Alerts requiring action now.
2. Alerts requiring review soon.
3. Informational/resolved history.

Each item must communicate: what changed → why it matters → affected financial context → recommended next action. Severity cannot be color-only.

### Layout
- Header 12/12 with concise alert-state summary.
- Filter/status controls immediately above the list.
- Main queue 8 columns + optional 4-column selected-alert context on wide Desktop; otherwise 12-column stack.
- Unread/read behavior is structurally supported but final unread indicators and feedback contracts remain P23/P24.

### Actions
Primary: contextual action that opens the affected financial context or corrective flow. Secondary: mark/read-state or history filtering only if supported. No bulk destructive behavior is introduced here.

### States
LOADING/SKELETON, EMPTY, ERROR, NO_RESULTS, ACTIVE/RESOLVED grouping, selected context. Exact notification semantics remain P23.

---

## S05 — Archive
**Status: NO STANDALONE ARCHIVE SCREEN APPROVED.**

No registered `/archive` route or approved product requirement exists. P15 therefore prohibits creating a generic archive page. Historical/resolved records remain in their owning domains through status/filter/history patterns (e.g. resolved alerts, past financial activity) until a future governed requirement proves a dedicated archive is necessary.

---

## S06 — Help
**Status: NO STANDALONE HELP ROUTE APPROVED.**

Desktop secondary-screen guidance is to provide contextual help in the owning screen through concise supporting text, empty/error recovery guidance and accessible help affordances when evidence shows a need. A full Help Center, chat support, FAQ product or ticketing flow is not introduced by P15. Final microcopy/help language remains UX-P27.

---

## S07 — Secondary Reports — PG-REPORT-001 `/reports`
### Governance boundary
P14 owns the core report architecture. P15 defines secondary report states/views **inside the same registered Reports surface**, not additional report routes.

### Secondary report patterns
- Category/merchant breakdown.
- Period comparison.
- Debt/obligation progress evidence.
- Goal/savings progress evidence.
- Risk/alert history evidence when supported by data.

### Composition
Question/title → context/period → concise insight → evidence chart/table → breakdown → link to underlying records. Secondary reports inherit the P14 insight-first rule and must not become chart galleries.

### Actions
Period/filter changes and drill-down are secondary. Export/print remains out of scope unless later approved.

### States
Insufficient data, no comparable history, filtered no-results, loading and error must preserve the report question and explain the next useful action.

---

## S08 — Rare Flows
Rare flows reuse existing screens/components instead of creating a parallel visual language.

### Governed rare-flow set
1. **First-run/onboarding continuation** — PG-ONBOARD-001; focused task shell, no full app navigation until completion context is appropriate.
2. **Global page failure/retry** — use the established error-recovery composition with plain-language cause category, Retry and safe route back to the financial command center/system context.
3. **Profile/account credential changes** — existing profile/settings surfaces; pending/success/error feedback required in later P23/P24.
4. **Session/access interruption** — return to authentication while preserving a safe intended destination when technically appropriate; no sensitive data is exposed.
5. **Future offline/sync condition** — composition placeholder only, because offline-first behavior is a future technical direction; final behavior belongs to P19/P23/P24.
6. **Unavailable/deleted entity** — explain that the item cannot be accessed and return the user to the owning list/context; do not present raw 404/backend terminology.

### Rare-flow principle
Rare does not mean visually exceptional: identity, tokens, typography, icons, spacing and controls remain identical to the main system. Recovery action is always clearer than technical diagnosis.

---

## Cross-screen hierarchy map
| P15 step/surface | Primary information | Primary action |
|---|---|---|
| Settings | Current account/settings group | Save current change when explicit commit exists |
| User Management | N/A | N/A |
| Activity Log / Workspace | Meaningful account/system event history | Usually none; inspect/recover context as needed |
| Notifications | Actionable financial alerts | Open/correct affected financial context |
| Archive | No standalone screen | N/A |
| Help | Contextual assistance only | Context-dependent recovery/help action |
| Secondary Reports | Secondary financial insight + evidence | Context-dependent drill-down/filter |
| Rare Flows | What happened + safe next step | Recover / continue / retry |

## Phase boundary
P15 defines Desktop secondary-screen compositions only. P16–P18 own Mobile layout/screens; P20 forms, P21 tables/data, P22 navigation, P23 notifications/feedback, P24 states, P25 motion, P26 accessibility and P27 UX writing remain authoritative for their detailed concerns.
