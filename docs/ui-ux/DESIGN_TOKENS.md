# Design Tokens — Current Runtime Mapping

STATUS: CURRENT REFERENCE POINTER

This document no longer carries an independent palette or font family. The executable authority is:

- `src/design-system/ndos-v1.2.tokens.json` — frozen official identity values.
- `src/design-system/ndos-v1.2.css` — official Namaa identity aliases/invariants.
- `src/design-system/tokens.css` — executable UX primitives.
- `src/design-system/themes.css` — light/dark semantic mappings.
- `src/design-system/typography.css` — type roles.
- `src/design-system/responsive.css` — viewport bands.

## Frozen identity values

| Family | Value |
|---|---|
| Primary green | `#0B6B4F` |
| Supporting green | `#189F7F` |
| Brand gold | `#D4AF6B` |
| Limited action gold | `#FCAA30` |
| Warm application surface | `#FAF9F4` |
| Warm cream | `#FFF7E6` |
| Card surface | `#FFFFFF` |
| Primary text | `#1F2937` |
| Secondary text | `#61758A` |
| Border | `#DCE6E0` |
| Strong border | `#C9D8D1` |
| Operational font | `Noto Sans Arabic` |

## Runtime scales

Spacing: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Radius: `6, 8, 12, 16, 20, 24, pill`.

Control heights: `32, 40, 48`.

Viewport bands:
- Mobile: below `768px`
- Tablet: `768–1023px`
- Desktop: `1024–1439px`
- Wide: `1440px+`

## Governance

Historical blue/cyan palettes, IBM Plex Sans Arabic, Tajawal, and any old phase-local values are deprecated and must not be used as runtime authority.

User-approved reference images govern visual composition and hierarchy. The current project governs routes, data, permissions and behavior. Frozen identity assets/tokens govern logo, font and official brand colors.
