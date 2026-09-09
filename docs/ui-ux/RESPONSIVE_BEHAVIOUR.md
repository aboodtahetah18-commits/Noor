# Responsive Behaviour System — UX-P19

PHASE: UX-P19
STATUS: APPROVED
DECISION: DEC-UI-022
TARGETS: DV-DESKTOP + DV-MOBILE
TRANSITIONAL RANGE: 768–1023px (responsive interpolation only; not a separate Tablet product target)

## Purpose
This document is the authoritative responsive transformation contract between the approved Desktop and Mobile systems. It does not create a third Tablet product experience. It defines how layouts, navigation, data, forms, overlays, typography and content progressively recompose across the governed breakpoints from UX-P08/P11.

## Breakpoint contract
| Range | Token | Role | Primary composition |
|---|---|---|---|
| `<768px` | compact | Mobile | 4-column, phone-native, one-column tasks |
| `768–1023px` | `--ux-bp-medium` | Transitional | 8-column interpolation; no Tablet-specific IA |
| `1024–1439px` | `--ux-bp-desktop` | Desktop | 12-column Desktop shell |
| `>=1440px` | `--ux-bp-wide` | Wide Desktop | 12-column with governed wider padding/container |

Rules:
- Breakpoints are content/layout boundaries, not device-brand assumptions.
- No new breakpoint may be introduced by a screen/component without governed change.
- Responsive changes must preserve task meaning, information priority and permissions.
- Mobile is not a scaled Desktop and Medium is not a third product experience.

## 1. UX-P19-S01 — Desktop to Medium
At widths below `1024px`:
- The persistent Desktop sidebar must no longer consume a fixed Desktop-width rail.
- 12-column compositions reflow to the 8-column transitional grid.
- Multi-column summary layouts may move from 4-up/3-up to 2-up when content requires it.
- Primary content keeps `24px` inline page padding and `24px` gutters.
- Supporting rails move below or after primary content when simultaneous columns would compress financial meaning.
- Dense tables begin their responsive transformation before horizontal page overflow appears.
- Page-header actions may wrap into a second logical row; primary action remains first in hierarchy.
- Desktop hover-only affordances must not be required for task completion.

## 2. UX-P19-S02 — Medium to Mobile
Below `768px`:
- Layout changes to the 4-column Mobile grid with `16px` page padding/gutter.
- Desktop/medium multi-column forms collapse to one column.
- Summary cards normally become one per row; 2+2 is allowed only for short comparable metrics.
- Supporting panels move into the primary vertical flow or governed sheet/page patterns.
- Persistent Desktop navigation is replaced by the Mobile navigation composition; DOM order must not be mechanically mirrored.
- Horizontal page scrolling is prohibited as a normal outcome.
- Touch targets and one-hand rules from UX-P16 become mandatory.

## 3. UX-P19-S03 — Sidebar behaviour
- `>=1024px`: persistent scroll-safe RTL Desktop sidebar per UX-P13.
- `768–1023px`: sidebar is not retained as a full persistent Desktop rail. Navigation is transformed into a compact transitional container/pattern owned by UX-P22, while content receives the 8-column layout.
- `<768px`: no Desktop sidebar. Mobile top/bottom navigation rules from UX-P16 apply.
- Sidebar collapse is a structural transformation, not a CSS scale/width reduction.
- Navigation reachability must never depend on viewport height plus `overflow:hidden`.

## 4. UX-P19-S04 — Table behaviour
Priority order when available width decreases:
1. Preserve essential columns and financial meaning.
2. Remove/defer nonessential supporting columns into detail context.
3. Recompose row data into record-card/key-value/prioritized-list patterns below Mobile boundary.
4. Use horizontal overflow only for genuinely comparative analytical tables where column preservation is essential and explicitly justified.

Rules:
- Filters/search/sort remain reachable before the transformed data.
- Numeric alignment/tabular numerals are preserved.
- Row actions become explicit mobile actions or overflow menus without shrinking below target sizes.
- No table may force horizontal overflow on the entire page container.
- UX-P21 owns final table/data mechanics; this phase owns the cross-range transformation.

## 5. UX-P19-S05 — Form behaviour
- Desktop may use multiple columns only for genuinely related fields and within the form container.
- Medium progressively reduces column count when label/control readability would be compromised.
- Mobile defaults to one column for all primary financial tasks.
- Labels, validation and help remain attached to the same field during reflow.
- Primary/secondary actions may wrap or stack; they must not become horizontally scrolling rows.
- Sticky/fixed actions must reserve safe-area/navigation space on Mobile.
- Input order follows task semantics and must remain stable across breakpoints.
- UX-P20 owns detailed validation/save/upload behavior.

## 6. UX-P19-S06 — Modal behaviour
- Desktop: modal/dialog may remain centered when the task is focused and bounded.
- Medium: dialog width becomes fluid within governed page/overlay padding; no raw local widths.
- Mobile: short selection/confirmation tasks prefer Bottom Sheet; longer forms or multi-step financial work become full pages; modal is reserved for bounded interruptive tasks.
- Drawer may support long secondary context but must not replace a primary task page.
- Overlay content must never exceed viewport height without its own accessible scroll region.
- Explicit close/cancel remains available at every range.

## 7. UX-P19-S07 — Navigation behaviour
- Desktop uses the approved persistent sidebar + contextual topbar model.
- Medium uses a compact transitional navigation composition; exact final destinations/controls belong to UX-P22.
- Mobile uses lightweight header + bottom navigation for highest-frequency destinations, with contextual overflow/More where governed.
- The current destination/selected state must survive every transformation.
- Navigation semantics and route hierarchy do not change merely because the viewport changes.
- RTL start/end and back/next directions follow UX-P10/UX-P22 semantics.

## 8. UX-P19-S08 — Typography scaling
- Typography scales by approved roles/tokens only; no arbitrary fluid font-size formulas may be introduced per screen.
- Desktop/medium/mobile may map approved responsive token variants where defined, but roles remain semantically stable.
- Financial numeric roles preserve tabular numerals and bidi isolation across ranges.
- Long titles wrap before they shrink below their approved role.
- Dense Mobile layouts must not achieve density by reducing body text or controls below accessibility baselines.

## 9. UX-P19-S09 — Content wrapping
- Arabic text uses natural RTL wrapping and logical start/end alignment.
- Long headings wrap up to the owning screen/component limit; ellipsis is used only where full text is available elsewhere or nonessential.
- Long monetary values must remain readable; values may wrap as a unit with currency or use governed compact formatting only where financial meaning is preserved.
- Action groups wrap/stack rather than create horizontal page scrolling.
- Cards/grids reflow before their minimum readable content width is violated.
- URLs/technical identifiers use safe breaking where unavoidable; they must not expand page width.

## 10. UX-P19-S10 — Breakpoint validation
Validation matrix:
| Check | `<768` | `768–1023` | `1024–1439` | `>=1440` |
|---|---|---|---|---|
| Page grid | 4 col | 8 col | 12 col | 12 col |
| Page padding | 16 | 24 | 32 | 40 |
| Sidebar | none | transformed | persistent | persistent |
| Form default | 1 col | progressive | task-dependent | task-dependent |
| Table target | cards/lists | reduced/reflow | table | table |
| Primary navigation | mobile | transitional | desktop | desktop |
| Page horizontal overflow | prohibited | prohibited | prohibited | prohibited |
| Touch target baseline | >=44 | >=44 where touch-capable | >=44 interactive baseline | >=44 interactive baseline |

Required validation scenarios:
- 320/360/390/430px compact phones.
- 768px exact medium boundary.
- 1023px medium edge and 1024px Desktop boundary.
- 1280/1366px common Desktop widths.
- 1440px wide boundary and larger widths.
- Short-height Desktop viewport for sidebar reachability.
- Arabic long labels, large financial values and validation messages.
- Filters + data + actions together without layout collision.

## Anti-patterns prohibited by this system
- Adding local one-off breakpoints to fix individual pages.
- Keeping Desktop sidebar/table/form geometry and merely shrinking it.
- Horizontal scrolling action bars as a normal Mobile interaction.
- Hiding financially important information only to make a layout fit.
- Changing route semantics or user permissions based on viewport.
- Scaling typography below approved roles to avoid wrapping.

## Resolved audit/backlog scope
This phase resolves the responsive-system portion of:
- `AUD-P02-010 / BK-010`: cross-range rules now explicitly prohibit phone two-column forms and horizontally scrolling action rows as target patterns. Detailed form behavior remains UX-P20.
- `AUD-P02-011 / BK-011`: overlapping/ad-hoc breakpoint behavior is replaced by one governed transformation contract. Detailed table/data transformation remains UX-P21.

## Phase boundaries
- UX-P20: detailed Forms & Inputs behavior.
- UX-P21: detailed Tables & Data behavior.
- UX-P22: final Navigation destinations/interaction.
- UX-P24: exhaustive state behavior.
- UX-P26: accessibility certification at all ranges.
- UX-P28/P29: cross-system and pixel-level responsive verification.
