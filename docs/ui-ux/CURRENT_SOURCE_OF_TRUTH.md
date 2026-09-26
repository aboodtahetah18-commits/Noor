# Current UI/UX Source of Truth

Current governed visual identity package: **نماء — الهوية البصرية المعتمدة v1.0 — 2026-09-22**.

This package is the highest visual authority for Namaa. The effective frozen identity inside it is **NDOS v1.2 FINAL** with the executable design system **v2.0**.

## Authority order

When any source conflicts, use this order:

1. Frozen identity / explicit identity freeze rules.
2. AI UI / design execution contract.
3. Machine-readable tokens, components, microstates, and icon contracts.
4. Human-readable component and page specifications.
5. Approved visual references / Golden References.
6. Layout-only references.
7. Deprecated references: never use.

Older phase notes, screenshots, experimental palettes, legacy CSS, or generated mockups never override this authority.

## Mandatory brand invariants

- Arabic / RTL is the primary product direction.
- Operational font: **Noto Sans Arabic**.
- Primary brand green: `#0B6B4F`.
- Supporting green: `#189F7F`.
- Brand gold: `#D4AF6B`.
- Limited action gold: `#FCAA30`.
- Warm application surface: `#FAF9F4`.
- Warm gold surface: `#FFF7E6`.
- Card surface: `#FFFFFF`.
- Default border: `#DCE6E0`.
- Primary text: `#1F2937`.
- Secondary text: `#61758A`.
- Semantic warning / danger / info colors are functional only and must never become brand colors.
- Do not reintroduce navy/cyan as primary Namaa brand colors unless a newer formally approved identity release explicitly changes the palette.

## Official logo authority

Only the approved repository/project copies corresponding to these source files may be used:

- `namaa-logo-color-transparent.png` for light / suitable backgrounds.
- `namaa-logo-white-transparent.png` for dark backgrounds.

Logo rules:

- Never redraw, trace, regenerate, approximate, or reinterpret the Namaa logo.
- Never reconstruct the mark from screenshots.
- Never use a generated logo from an AI mockup.
- Never change the leaf geometry, wordmark proportions, spacing, orientation, or colors.
- Never include the phrase `01. الشعار والهوية` or the marketing phrase `مستقبل مالي أكثر وعياً` as part of the logo asset.
- Never place the logo inside an invented white card/background unless the approved composition explicitly requires it.
- If a supplied design mockup has the wrong logo but the layout is otherwise approved, keep the layout and replace only the logo with the official asset.

## Layout and component rules

- Tokens are the only source for colors, spacing, radii, sizing, shadows, and typography.
- Reuse shared governed components before adding route-local variants.
- Cards are white with calm borders and very light shadows.
- Core radii use the governed 12–16px component range and 20–24px large-container range.
- Icons use a consistent outline / soft-rounded visual weight.
- No uncontrolled gradients, glow, decorative 3D, or page-local visual language.
- Mobile exposes the full current platform responsively; no core capability is hidden by viewport. Dashboards and dense tables must use approved responsive patterns rather than desktop shrink-down.
- All new data-driven screens must define loading, empty, success, recoverable error, and unavailable states where applicable.

## Golden visual references

The approved identity package images in the project sources are Golden References for:
- the primary identity board,
- system conversation surfaces,
- mobile conversation layouts,
- principal page patterns,
- bank identities,
- governance and committee identities,
- approved algorithmic character visual language.

The user-approved platform reference images are the binding visual authority for composition and appearance. They may not override official logo assets, operational typography, or frozen identity colors; when those conflict, the official identity assets and frozen tokens win.

## Change control

The visual language is frozen. Content and data may change; the design language changes only through a newer explicitly approved identity release.

Any screen or design that violates this document is not considered complete even if it is otherwise visually polished.
