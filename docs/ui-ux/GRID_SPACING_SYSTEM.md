# Grid & Spacing System — UX-P11

PHASE: UX-P11
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-014

## Governance
This file is the authoritative layout/grid/spacing application registry approved in UX-P11. It consumes the primitive spacing and breakpoint tokens approved in UX-P08. Future layout work must not introduce arbitrary page padding, gutters, section gaps, card padding, form spacing, table spacing or container widths outside this system unless governed by a documented change.

Official product targets remain `DV-DESKTOP` and `DV-MOBILE`. The medium range is a responsive interpolation range only and does not reinstate Tablet as a target product experience.

## 1. Base spacing unit
The approved base rhythm is inherited from UX-P08:

- Base unit: `4px` = `--ux-space-1`
- All governed spacing compositions use the approved P08 scale only.
- No raw spacing value may be introduced in screen/component design where an approved spacing token exists.

Approved spacing primitives used by this system:
`0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px`.

## 2. Page padding
| Range | Layout role | Inline page padding | Token |
|---|---|---:|---|
| `<768px` | Compact / mobile | 16px | `--ux-space-4` |
| `768–1023px` | Medium transitional | 24px | `--ux-space-6` |
| `1024–1439px` | Desktop | 32px | `--ux-space-8` |
| `>=1440px` | Wide desktop | 40px | `--ux-space-10` |

Rules:
- Page padding is logical (`padding-inline`) and therefore RTL-native.
- Full-bleed elements are exceptional and must be explicitly documented by their owning phase/component.
- Nested page containers must not stack page padding twice.

## 3. Section spacing
Vertical separation between major page sections:

| Context | Standard gap | Emphasis gap |
|---|---:|---:|
| Compact/mobile | 32px (`--ux-space-8`) | 40px (`--ux-space-10`) |
| Medium | 40px (`--ux-space-10`) | 48px (`--ux-space-12`) |
| Desktop | 48px (`--ux-space-12`) | 64px (`--ux-space-16`) |
| Wide desktop | 48px (`--ux-space-12`) | 64px (`--ux-space-16`) |

Rules:
- Standard gap separates peer sections.
- Emphasis gap is reserved for a stronger hierarchy break, not routine stacking.
- Headings and their immediately related content use smaller internal component gaps, not section spacing.

## 4. Card padding
| Card context | Compact | Medium | Desktop/Wide |
|---|---:|---:|---:|
| Standard card | 16px | 20px | 24px |
| Dense/data card | 12px | 16px | 16px |
| Spacious/summary surface | 20px | 24px | 32px |

Rules:
- Card padding uses `--ux-space-*` tokens only.
- Internal card gaps should normally use 8, 12, 16 or 24px depending on hierarchy.
- Nested surfaces must not create unnecessary double padding.
- Exact mapping to card components is finalised in UX-P12.

## 5. Form spacing
| Relationship | Spacing |
|---|---:|
| Label → control | 8px (`--ux-space-2`) |
| Help/error text → control | 8px (`--ux-space-2`) |
| Field → field | 16px (`--ux-space-4`) |
| Related field group → group | 24px (`--ux-space-6`) |
| Form section → section | 32px (`--ux-space-8`) compact, 40px (`--ux-space-10`) desktop |
| Final field group → action row | 24px (`--ux-space-6`) |
| Action → action | 12px (`--ux-space-3`) compact, 16px (`--ux-space-4`) desktop |

Rules:
- Validation feedback must remain visually attached to its field; section spacing must not separate the error from the control.
- Multi-column form behavior is defined later by layout/form phases; spacing values remain governed here.

## 6. Table spacing
Desktop/data-table baseline:

| Element | Value |
|---|---:|
| Cell inline padding | 16px (`--ux-space-4`) |
| Cell block padding | 12px (`--ux-space-3`) |
| Dense table inline padding | 12px (`--ux-space-3`) |
| Dense table block padding | 8px (`--ux-space-2`) |
| Header/filter → table | 16px (`--ux-space-4`) |
| Table → pagination | 16px (`--ux-space-4`) |
| Row action gap | 8px (`--ux-space-2`) |

Rules:
- Minimum accessible interactive targets still consume the P08 size tokens; table density must not shrink controls below accessibility requirements.
- Mobile table transformation is defined in UX-P21/UX-P19; horizontal overflow is only a fallback, not the target mobile pattern.
- Long-content behavior is defined with the table system later, but padding remains governed here.

## 7. Desktop grid
Applies at `--ux-bp-desktop` (`1024px`) and above.

### Standard desktop
- Columns: **12**
- Gutter: **24px** (`--ux-space-6`)
- Page padding: **32px** (`--ux-space-8`)
- Content alignment: centered within the approved container width

### Wide desktop
- Columns: **12**
- Gutter: **24px** (`--ux-space-6`)
- Page padding: **40px** (`--ux-space-10`)
- Wider viewport does not justify uncontrolled line length or arbitrary card expansion.

Recommended span semantics (implementation mapping occurs in layout phases):
- Full-width: 12 columns
- Primary/content-heavy: 8 columns
- Supporting rail: 4 columns
- Half: 6 columns
- Three-up summary: 4 columns each
- Four-up compact metrics: 3 columns each

These are composition rules, not mandatory screen layouts.

## 8. Medium transitional grid
Applies from `768px` to `1023px` only as responsive interpolation.

- Columns: **8**
- Gutter: **24px** (`--ux-space-6`)
- Page padding: **24px** (`--ux-space-6`)
- No separate Tablet product IA or journey is introduced.
- Layouts may collapse progressively before the Desktop boundary; exact responsive behavior belongs to UX-P19.

## 9. Mobile grid
Applies below `768px`.

- Columns: **4**
- Gutter: **16px** (`--ux-space-4`)
- Page padding: **16px** (`--ux-space-4`)
- Primary content normally spans all 4 columns.
- Two-column compact compositions may use 2+2 only when readability and touch-target rules remain valid.
- Dense financial content must recompose for mobile instead of simply shrinking Desktop layouts.

## 10. Container widths
Container values are layout constants governed by UX-P11 and are not ad-hoc per-screen widths.

| Container | Max width | Intended use |
|---|---:|---|
| `--ux-container-reading` | 640px | Long-form explanatory/read-only text |
| `--ux-container-form` | 720px | Focused single-task forms/settings flows |
| `--ux-container-content` | 1200px | Standard authenticated product content |
| `--ux-container-wide` | 1280px | Data-dense/wide desktop compositions when justified |

Rules:
- Compact/mobile remains fluid inside governed page padding.
- The default authenticated product container is `--ux-container-content`.
- `--ux-container-wide` is not the default; use requires information-density justification.
- Reading/form containers may sit inside the wider shell without inventing local widths.

## Semantic spacing aliases
The following aliases are approved for future implementation. They map only to approved primitives:

```css
:root {
  --ux-page-padding-compact: var(--ux-space-4);   /* 16 */
  --ux-page-padding-medium: var(--ux-space-6);    /* 24 */
  --ux-page-padding-desktop: var(--ux-space-8);   /* 32 */
  --ux-page-padding-wide: var(--ux-space-10);     /* 40 */

  --ux-grid-gutter-mobile: var(--ux-space-4);     /* 16 */
  --ux-grid-gutter-medium: var(--ux-space-6);     /* 24 */
  --ux-grid-gutter-desktop: var(--ux-space-6);    /* 24 */

  --ux-section-gap-mobile: var(--ux-space-8);     /* 32 */
  --ux-section-gap-desktop: var(--ux-space-12);   /* 48 */

  --ux-container-reading: 640px;
  --ux-container-form: 720px;
  --ux-container-content: 1200px;
  --ux-container-wide: 1280px;
}
```

## RTL rules
- Use logical properties: `padding-inline`, `margin-inline`, `inset-inline`, `gap`.
- Grid column numbering may remain implementation-neutral; visual order and start/end alignment must respect RTL semantics.
- Do not hard-code left/right spacing where start/end expresses the intended relationship.

## Phase boundaries
- UX-P12 maps these spacing rules to components.
- UX-P13/P16 define detailed Desktop/Mobile layout systems.
- UX-P19 defines responsive transformations between ranges.
- UX-P20 defines detailed form composition behavior.
- UX-P21 defines detailed table/data transformation behavior.
- UX-P26 certifies accessibility.
