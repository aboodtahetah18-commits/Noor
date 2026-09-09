# Iconography System — UX-P10

PHASE: UX-P10
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-013

## Governance
This file is the authoritative iconography registry approved in UX-P10. Future UI work must use this system rather than arbitrary emoji, text glyphs, mixed icon packs, or page-specific icon styling.

The system inherits:
- Visual identity: DEC-UI-010 / UX-P07 (CR-001 standalone identity).
- Design tokens: DEC-UI-002 / UX-P08.
- Typography hierarchy: DEC-UI-003 / UX-P09.
- Product is Arabic-first and RTL-native.
- Official device targets remain DV-DESKTOP and DV-MOBILE.

## 1. Approved icon family
### Primary family
**Lucide Icons** is the approved implementation family for product UI icons.

Rationale:
- coherent outline geometry suitable for a calm financial product;
- broad functional coverage for navigation, finance, forms, tables and feedback;
- consistent visual weight at small UI sizes;
- straightforward RTL handling for directional icons;
- avoids the mixed emoji/text-glyph/icon patterns found in the audited system.

### Family rule
- Use one icon family per product UI: Lucide.
- Do not mix Material Symbols, Font Awesome, Heroicons, emoji, Unicode dingbats or custom decorative symbols into ordinary UI.
- A custom icon is permitted only when Lucide has no semantically adequate icon and only through a governed design decision; it must match this geometry and stroke model.
- Brand marks/logos are not UI icons and remain governed by the standalone product brand-asset rules.

## 2. Geometry and stroke
- Style: outline, no decorative fill.
- Default stroke width: **2px** at 20px and 24px icon sizes.
- Line cap: round.
- Line join: round.
- Icons must preserve the source viewBox/aspect ratio; do not stretch.
- Do not mix outline and filled variants for the same semantic role.
- Filled shapes are reserved for unavoidable source assets/brand marks, not navigation or ordinary actions.
- Selected state is expressed by semantic color/surface/label treatment rather than switching to an unrelated filled icon family.

## 3. Approved icon sizes
Only these UI icon sizes are approved:

| Role | Size | Token mapping / boundary |
|---|---:|---|
| Compact/supporting | 16px | `--ux-size-4` |
| Standard control | 20px | `--ux-size-5` |
| Primary navigation / mobile | 24px | `--ux-size-6` |
| Large state/empty-state support | 32px | `--ux-size-8` |

Rules:
- 20px is the default Desktop action/control icon.
- 24px is the default persistent Mobile navigation icon.
- 16px is supporting metadata/table/status use only and must not become a tiny icon-only tap target.
- 32px is for prominent state illustration support, not ordinary controls.
- Interactive target size is independent from glyph size and must respect the approved 44px accessible target primitive where applicable.
- Arbitrary values such as 18px, 22px, 26px or page-specific transforms are not approved.

## 4. Icon color rules
Icons consume approved identity/token colors only.

| Semantic role | Approved treatment |
|---|---|
| Default foreground | `--ux-text-primary` / `#0B1220` |
| Inverse foreground | `--ux-text-inverse` / `#ffffff` on valid dark surface |
| Selected/accent | `--ux-action-primary` / `#2563EB` |
| Focus/active cue | approved focus/accent token plus non-color state cue |
| Disabled | navy-based approved alpha/opacity treatment + disabled interaction semantics |
| Signal accent | `#06B6D4` may support charts/highlights; it is not the default small icon foreground on white |

Semantic state colors from the revalidated token system are permitted, but state meaning must still use icon shape + label/message + state container, never color alone.

## 5. Navigation icons
Navigation icons are stable semantic landmarks. A destination must keep the same icon across Desktop and Mobile unless the navigation function itself differs.

Recommended canonical mapping:

| Navigation meaning | Canonical Lucide icon |
|---|---|
| Home / financial overview | `House` |
| Transactions / operations | `ListChecks` or `ReceiptText` (choose one at component mapping; do not mix) |
| Budget / money management | `WalletCards` |
| Obligations / debts | `Landmark` or `CreditCard` according to final label semantics |
| Goals | `Target` |
| Planning | `ClipboardList` |
| Advisor / decision support | `Sparkles` only when it semantically represents advisor intelligence, not decoration |
| Alerts | `Bell` |
| Reports / analysis | `ChartNoAxesCombined` |
| Settings | `Settings` |
| Profile/account | `CircleUserRound` |
| More | `Ellipsis` |

Rules:
- Persistent navigation uses icon + visible text label by default.
- Do not use decorative stars/diamonds merely to add visual interest.
- Active navigation must not rely on icon color alone; label/surface/indicator must reinforce selected state.

## 6. Action icons
Canonical actions:

| Action | Canonical icon |
|---|---|
| Add/create | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Close | `X` |
| Confirm/done | `Check` |
| Retry/refresh | `RefreshCw` |
| Upload | `Upload` |
| Download/export (if later in scope) | `Download` |
| Show/view | `Eye` |
| Hide | `EyeOff` |
| Calendar/date | `CalendarDays` |
| Copy | `Copy` |

Safety rules:
- Destructive financial actions must use text + icon when practical; a lone trash icon is not sufficient for high-consequence contexts.
- Icon-only controls require an accessible name (`aria-label` or equivalent) and tooltip/help where meaning is not universally obvious.
- Do not place two different icons on the same action across pages.

## 7. State icons
Canonical semantic shapes:

| State | Icon | Meaning reinforcement |
|---|---|---|
| Success | `CircleCheck` | explicit success text required |
| Warning / risk | `TriangleAlert` | risk/warning text required |
| Error | `CircleX` | explicit error text required |
| Information | `Info` | informational text/context required |
| Loading / processing | `LoaderCircle` only when animated later by P25 rules | loading text for non-trivial waits |
| Empty / no results | `SearchX` or domain-specific neutral icon | empty/no-results text required |
| Offline | `WifiOff` | offline text/status required |
| Permission denied / protected | `LockKeyhole` | permission explanation required |

No state is communicated by color alone. Motion for `LoaderCircle` is deferred to UX-P25.

## 8. Table and data icons
- Sorting: `ArrowUpDown`; resolved direction may use `ArrowUp` / `ArrowDown`.
- Row menu: `Ellipsis`.
- Edit: `Pencil`.
- Delete: `Trash2`.
- View/details: `Eye`.
- Expand/collapse: `ChevronDown` / `ChevronUp` according to expansion state.
- Filter: `SlidersHorizontal`.
- Search: `Search`.

Rules:
- Header sort icons must expose sort state programmatically and visually; the icon alone is insufficient.
- Repeated row actions must maintain consistent order and labels.
- On Mobile, row actions may transform later in UX-P21/UX-P18; icon semantics remain unchanged.

## 9. Mobile icon rules
- Persistent bottom navigation glyph: 24px.
- Mobile top-bar control glyph: 20px or 24px according to hierarchy; target remains at least the governed interactive target.
- Bottom navigation requires visible labels for primary destinations.
- Central Add may receive stronger visual emphasis, but still needs visible/accessibility label and must use `Plus` consistently.
- Do not shrink icons below 16px to fit dense layouts.
- Do not create a separate Mobile icon family; Desktop and Mobile share semantics and family.

## 10. RTL and directionality
### Mirror in RTL when the meaning is directional
- back/forward arrows;
- previous/next arrows;
- chevrons communicating inline progression;
- undo/redo where direction is part of the action;
- enter/exit directional metaphors when the source icon is inherently LTR.

### Do not mirror merely because the UI is RTL
- search;
- bell;
- settings;
- user/profile;
- calendar;
- wallet/card;
- target;
- trash;
- plus/minus;
- info/warning/error;
- download/upload when vertical;
- charts unless the icon encodes a literal directional flow that changes meaning.

Prefer semantic properties (`inline-start` / `inline-end`) and explicit RTL icon mapping for directional controls rather than arbitrary CSS transforms on every SVG.

## 11. Accessibility
- Decorative icons: `aria-hidden="true"` / non-focusable.
- Icon-only interactive controls: accessible name is mandatory.
- Do not duplicate spoken text when icon sits beside the same visible label.
- State icons must be accompanied by readable text.
- Touch/click target is governed independently from glyph size.
- Focus state belongs to the interactive control container, not only to the SVG.

## 12. Prohibited usage
- Emoji as interface icons.
- Unicode symbols such as `✦`, `◈`, `↗` as uncontrolled UI iconography.
- Mixed icon libraries on one product surface.
- Arbitrary stroke widths, sizes, fills, rotations or colors.
- Icon-only destructive action with no accessible/visible context where risk is material.
- Using an icon as decoration when it adds no information or navigation value.
- Mirroring all icons globally in RTL.

## 13. Implementation reference
```tsx
// Family: lucide-react
import { Search, Bell, Plus, Trash2 } from "lucide-react";

<Search
  size={20}
  strokeWidth={2}
  aria-hidden="true"
/>

<button aria-label="التنبيهات" className="...">
  <Bell size={20} strokeWidth={2} aria-hidden="true" />
</button>
```

This is an implementation reference, not a component definition. Component states/layout remain governed by later phases.

## 14. Phase boundary
UX-P10 defines icon semantics and visual rules only. It does not:
- design final navigation components (UX-P22);
- define full component architecture (UX-P12);
- create detailed screen layouts (UX-P13+);
- define motion behavior (UX-P25);
- certify accessibility (UX-P26).
