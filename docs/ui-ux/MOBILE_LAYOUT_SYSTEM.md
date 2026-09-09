# Mobile Layout System — UX-P16

PHASE: UX-P16
STATUS: APPROVED
DECISION: DEC-UI-019
DEVICE: DV-MOBILE

## Purpose
This document is the authoritative Mobile layout baseline for the personal-finance product. Mobile is a first-class product experience, not a scaled Desktop composition. The system consumes the approved identity, tokens, typography, iconography, grid/spacing and component architecture from UX-P07–P12 and preserves screen-specific work for UX-P17/P18.

## 1. Mobile shell
### Structure
1. System safe-area inset at the top.
2. `CMP-NAV-MOB-HEADER` composition zone for page context and limited utilities.
3. Scrollable page-content region using the 4-column compact grid.
4. Optional contextual sticky action only when task continuity requires it.
5. Persistent bottom-navigation region where the current journey requires global destinations.
6. Bottom safe-area inset.

### Rules
- The shell is fluid below `--ux-bp-medium` and uses `16px` (`--ux-page-padding-compact`) inline page padding.
- Primary content normally spans all 4 columns.
- The shell must reserve space for fixed bottom navigation so content/actions cannot be obscured.
- Horizontal page scrolling is prohibited as a normal layout behavior.
- Full-bleed surfaces are exceptional and must still preserve readable internal padding.
- Auth/onboarding/recovery may use focused shells without persistent bottom navigation.

## 2. Mobile header
- Default minimum interactive/header row: `56px` (`--ux-size-14`) excluding safe-area inset.
- RTL ordering is semantic: page title/context begins at inline-start; utility actions occupy inline-end.
- Title uses approved Page/Card title roles; long titles truncate or wrap according to task importance rather than shrink below typography tokens.
- Header may contain back, alert, profile or one context utility; it must not become a second navigation bar.
- Icon-only actions require an accessible name and >=44px target.
- Large decorative hero headers are not part of the default mobile shell.

## 3. Bottom navigation
- Persistent global navigation is reserved for the highest-frequency destinations only; target composition supports up to 5 items.
- Container uses a white/default surface, governed border/shadow tokens and `--ux-z-navigation`.
- Each item target is >=44px; icon uses the approved Lucide 20/24px scale and a text label where ambiguity is possible.
- Active state uses Advisor Blue plus label/shape semantics; color alone is insufficient.
- Primary quick-add may receive stronger visual emphasis but must remain within the same token system and must not obscure other destinations.
- The container adds `env(safe-area-inset-bottom)` without reducing target size.
- Exact destination ownership and active-route semantics are finalized in UX-P22.

## 4. Mobile drawer
- Drawer is not the default mobile container for short task/action selection; Bottom Sheet is preferred for compact mobile actions.
- A mobile drawer may be used for secondary/global overflow navigation or a long contextual index when a full page would create unnecessary task switching.
- Drawer enters from the logical inline side appropriate to RTL semantics and uses overlay/focus foundations from `CMP-DRW-001`.
- Drawer width is fluid and must leave visible context where practical; no raw fixed width is introduced here.
- Closing must be available via explicit control; swipe/gesture may supplement but never replace it.
- Complex financial workflows must become a page, not an oversized drawer.

## 5. Mobile cards
- Standard card spans 4 columns; 2+2 compact cards are allowed only for short comparable metrics with preserved readability/touch targets.
- Card padding: 16px standard, 12px dense, 20px summary, using P11 mappings only.
- Default visual hierarchy: label/context → primary financial value → interpretation/state → action/next step.
- Financial value hierarchy is typographic first; accent/semantic color is supporting only.
- Nested cards and card-within-card compositions are discouraged.
- Entire-card tap targets are used only when the whole surface has one unambiguous destination; otherwise explicit actions are required.

## 6. Mobile forms
- Default phone form layout is **one column**. Two-column fields are prohibited as a general phone pattern.
- Label → control: 8px; field → field: 16px; group → group: 24px, from P11.
- Default controls are 44px minimum height; primary task controls may use 48px where P12 variants allow.
- Primary submit action is full-width where that improves one-hand reach and clarity; secondary/cancel actions must not force horizontal scrolling.
- Validation remains attached to the field and does not disappear when moving between steps.
- Keyboard/input type, validation logic, dirty-state protection and detailed form behavior remain owned by UX-P20.

## 7. Mobile tables alternative
Horizontal table scrolling is a fallback, not the target product pattern.

Approved transformation patterns:
1. **Record cards** — best for transaction/history rows: primary value + descriptor + date/status + row action.
2. **Key-value detail list** — best for a single selected record.
3. **Prioritized compact list** — best when only 2–4 attributes are required for comparison.
4. **Horizontal overflow** — allowed only for genuinely multi-column analytical comparison where preserving columns is essential; must be explicitly justified.

Rules:
- Table headers become labels within the mobile record representation where needed.
- Numeric alignment/tabular numerals are preserved.
- Sorting/filter/search controls remain reachable above the transformed data.
- Exact table behavior and financial-data density are finalized in UX-P21.

## 8. Bottom sheets
- `CMP-BS-001` is the preferred mobile container for short action selection, compact filter choice, confirmation context or a small contextual task.
- Sheet uses default surface, top radii from the approved radius scale, overlay token and `--ux-z-modal`.
- Internal inline padding: 16px; action targets >=44px.
- Bottom padding includes `env(safe-area-inset-bottom)`.
- Explicit close/cancel remains required; drag handle/gesture is supplemental.
- Long forms, multi-step planning and dense analysis must escalate to a full page.
- Destructive actions require explicit text and semantic treatment; confirmation/undo details remain P23/P24.

## 9. Touch targets
- Minimum interactive target: **44x44px** (`--ux-size-11`) where applicable.
- Preferred primary mobile action/control height: **48px** (`--ux-size-12`) when component variant permits.
- Visual icon may remain 20/24px inside a larger target.
- Adjacent destructive and primary actions require sufficient spacing from approved tokens; no tightly packed icon clusters.
- Inline links inside prose are not used for primary financial actions.
- Disabled controls remain visually identifiable and non-interactive without removing required explanatory context.

## 10. One-hand usage
Priority reach model for common phones:
- **Primary reach zone:** lower content region and persistent bottom navigation.
- **Secondary reach zone:** central content and inline actions.
- **Tertiary reach zone:** upper header utilities; reserve for navigation/context rather than frequent primary actions.

Rules:
- High-frequency create/continue/confirm actions should appear in the lower or naturally reachable flow position when it does not conflict with form semantics.
- Destructive actions must not be placed where accidental thumb activation is likely; separation and confirmation semantics are required.
- Important risk alerts may surface near the top for visibility, but their corrective action should remain reachable in the content flow.
- Reaching the top of a long page must not be required merely to complete a task.
- Bottom fixed actions must never collide with Bottom Navigation or safe-area insets.

## Density and scrolling
- Mobile defaults to Standard/Comfortable density; Dense mode is not achieved by shrinking typography or targets.
- Long financial pages use progressive disclosure and clear section hierarchy rather than horizontal compression.
- Only one primary vertical scroll region exists per normal page; nested scrolling requires explicit component justification.

## RTL
- Use logical properties for padding/insets/alignment.
- Back/next direction follows Arabic journey semantics per UX-P10.
- Numbers remain bidi-isolated where required by UX-P09.
- Bottom navigation order follows the approved Arabic IA/navigation semantics, not mirrored Desktop DOM order mechanically.

## Resolved audit scope
This phase resolves the **layout-system portions** of:
- `AUD-P02-010 / BK-010`: phone layouts no longer permit general two-column forms or horizontally scrolling action rows as the target pattern.
- `AUD-P02-011 / BK-011`: a single governed compact mobile layout baseline and explicit mobile-table alternatives replace fragmented layout assumptions.

Remaining implementation/detail ownership stays with UX-P17, UX-P19, UX-P20 and UX-P21 as registered.

## Phase boundaries
- UX-P17: Mobile core-screen compositions.
- UX-P18: Mobile secondary-screen compositions.
- UX-P19: responsive transformations between compact/medium/desktop ranges.
- UX-P20: detailed form/input behavior.
- UX-P21: detailed table/data behavior.
- UX-P22: final navigation architecture/behavior.
- UX-P23/P24: feedback, confirmation and states.
- UX-P26: accessibility certification.
