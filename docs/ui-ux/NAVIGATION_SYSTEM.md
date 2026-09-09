# Navigation System — UX-P22

PHASE: UX-P22
STATUS: APPROVED
DECISION: DEC-UI-025
TARGETS: DV-DESKTOP + DV-MOBILE
DIRECTION: RTL-first

## Purpose
Authoritative navigation contract for the personal financial advisor. It consumes the approved IA, journeys, layouts, responsive behavior and component architecture without redefining screen content.

## UX-P22-S01 — Main navigation
- Main product navigation represents the four approved IA domains: financial overview, money activity, planning/commitments/goals, analysis/risk/decision.
- Desktop uses the governed persistent sidebar; Mobile uses bottom navigation for the highest-frequency destinations.
- Settings/profile/utilities never compete with core financial domains.
- One navigation meaning maps to one destination concept; duplicate competing entry points are prohibited unless one is an explicit contextual shortcut.

## UX-P22-S02 — Secondary navigation
- Secondary destinations live within the current module/context and must not masquerade as global navigation.
- Utilities such as Settings, Workspace and supporting Reports are visually subordinate to core domains.
- Secondary navigation may use local links, section lists or contextual actions depending on task depth.

## UX-P22-S03 — Breadcrumbs
- Breadcrumbs are used only where hierarchy depth materially improves orientation on Desktop/medium ranges.
- Do not show breadcrumbs on shallow top-level pages.
- Mobile normally uses concise page title + governed Back behavior instead of a long breadcrumb chain.
- Breadcrumb labels use user language, never route slugs or implementation names.

## UX-P22-S04 — Tabs navigation
- Tabs switch peer views within the same information context; they never replace global navigation.
- Active tab is explicit visually and programmatically.
- Tab count is limited to what fits without horizontal ambiguity; on Mobile, if peers exceed available width use a governed alternative rather than uncontrolled horizontal scrolling.
- Tabs preserve current entity/context unless the label explicitly changes it.

## UX-P22-S05 — Back behaviour
Priority order:
1. Close transient overlay/sheet when Back is invoked from it.
2. Return to the immediately meaningful previous context when it remains valid.
3. Return to parent/list context for deep-linked detail/create/edit flows when browser history is unsafe/absent.
4. Never send the user to Dashboard merely because the previous context cannot be reconstructed.
- Unsaved-change protection from P20 applies before destructive navigation away from forms.

## UX-P22-S06 — Deep linking
- Protected deep links preserve the requested destination through authentication when technically possible.
- After successful login, return to the authorized requested context rather than always Dashboard.
- Invalid/deleted destinations resolve to a governed unavailable/not-found state with a useful parent route.
- Deep links may include safe filter/entity context but must not expose secrets or sensitive raw data in the URL.

## UX-P22-S07 — Active states
- Global active destination, local active tab and selected data row are distinct states and must not share ambiguous styling semantics.
- Active state uses color + shape/weight/indicator, not color alone.
- `aria-current="page"` or equivalent is required for current navigation destinations.
- Parent module may remain contextually indicated while a child/detail page is active.

## UX-P22-S08 — Mobile navigation
- Bottom Navigation contains only highest-frequency destinations and a governed quick-add action when applicable.
- Mobile top bar carries page context and small utilities; it does not duplicate the full bottom navigation.
- `More` is a navigation utility, not a business module.
- Safe-area and >=44px touch-target rules from P16 apply.
- Mobile navigation preserves semantic equivalence with Desktop while using phone-native composition.

## Navigation accessibility baseline
- Every icon-only navigation control has an accessible name.
- Focus order follows reading/task order.
- Directional icons follow the P10 RTL semantic mirroring rules.
- Current location is perceivable without relying solely on color.

## Phase boundaries
P23 owns cross-system feedback; P24 owns exhaustive states; P26 owns accessibility certification; P27 owns final UX wording.
