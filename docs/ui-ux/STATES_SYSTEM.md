# States System — UX-P24

PHASE: UX-P24
STATUS: APPROVED
DECISION: DEC-UI-027
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
Authoritative state contract for pages and components. States communicate system truth, preserve user context and provide a clear next action without relying on color alone.

## State priority
When multiple conditions coexist, the most actionable blocking state wins: Permission Denied / Error / Offline-blocked → Loading/Skeleton → Empty/No Results → Success/Default. Local component states may coexist when they do not contradict page truth.

## UX-P24-S01 — Default
- Default represents authoritative usable content, not placeholder data.
- Primary information/action hierarchy from P14/P17 is preserved.
- No stale success/error banner remains after its context expires.

## UX-P24-S02 — Loading
- Use when the user must wait for an operation or data required to continue.
- Preserve stable layout and disable only actions that would create duplicate/invalid work.
- Use concise status text for meaningful waits; never fake progress percentages.

## UX-P24-S03 — Skeleton
- Use only for predictable content structures where shape continuity reduces perceived disruption.
- Skeleton mirrors broad content geometry without imitating real financial values.
- Avoid skeleton for instant/local actions or where a spinner/status is clearer.

## UX-P24-S04 — Empty
- Means the dataset/context genuinely contains no records yet.
- Explain what the area is for and expose the most relevant first action when available.
- Do not present Empty as an error.

## UX-P24-S05 — No Results
- Means content exists but current search/filter criteria returned none.
- Show current query/filter context and provide Clear/Reset or a direct refinement path.
- Must remain distinct from Empty.

## UX-P24-S06 — Error
- Explain what failed in user language, preserve entered/contextual data when possible, and offer Retry or a meaningful recovery route.
- Raw backend codes/provider names/infrastructure language are prohibited.
- Error severity uses text/icon/structure in addition to color.

## UX-P24-S07 — Success
- Confirms authoritative completion and the resulting state.
- Routine success is concise; consequential financial outcomes may persist longer.
- Success never masks unsaved or failed secondary work.

## UX-P24-S08 — Disabled
- Disabled means currently unavailable, not merely visually de-emphasized.
- Where the reason is not obvious, expose a concise explanation/help association.
- Disabled controls remain legible and distinguishable; never use disabled state as a substitute for validation feedback.

## UX-P24-S09 — Offline
- Current product is online-first; Offline is a governed future-compatible state, not a claim that offline sync is implemented.
- Read-only cached/local content may be identified only when technically authoritative.
- Actions requiring network clearly state that connection is needed and preserve pending user work when possible.
- Future local-save/sync must expose Pending Sync / Synced / Sync Error semantics without fabricating successful cloud persistence.

## UX-P24-S10 — Permission Denied
- Current end-user model has one Account Owner; cross-role denial is uncommon but protected/unauthorized resources still require a state.
- Explain lack of access without exposing sensitive existence/details.
- Offer authentication or a safe parent destination where appropriate.
- Do not invent Admin/Approver roles.

## Component state matrix baseline
Applicable interactive components review: DEFAULT, HOVER, FOCUS, PRESSED, SELECTED, LOADING, ERROR, SUCCESS, DISABLED. Data surfaces additionally review SKELETON, EMPTY, NO_RESULTS, OFFLINE and PERMISSION_DENIED when relevant.

## Phase boundaries
P25 owns motion between states; P26 certifies accessibility; P27 finalizes wording; P28 validates cross-system implementation consistency.
