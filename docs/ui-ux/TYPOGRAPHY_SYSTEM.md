# Typography System — UX-P09

PHASE: UX-P09
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-012

## Governance
This file is the authoritative typography-role registry for the product. IBM Plex Sans Arabic is re-approved independently for the standalone personal-finance product. All future screen/component typography must use the approved family and the roles below. Arbitrary font families, sizes, weights or line-heights are prohibited unless introduced through governed change.

## Font family
- Primary and only approved family: `IBM Plex Sans Arabic`, fallback `sans-serif`.
- Approved working weights: 400 Regular, 500 Medium, 600 SemiBold, 700 Bold.
- Do not synthesize alternate decorative/display fonts.
- Arabic UI is RTL-native; Latin fragments, codes and numbers may use directional isolation where required.

## Role scale
| Role / Token | Size | Weight | Line-height | Primary use |
|---|---:|---:|---:|---|
| `--ux-type-display` | 40px | 700 | 52px | Rare hero/financial summary statement; max one dominant display region per screen |
| `--ux-type-page-title` | 32px | 700 | 44px | Page title / primary screen heading |
| `--ux-type-section-title` | 24px | 600 | 34px | Major section heading |
| `--ux-type-card-title` | 18px | 600 | 28px | Card/module title |
| `--ux-type-body-lg` | 18px | 400 | 30px | Introductory/supporting paragraph or prominent explanation |
| `--ux-type-body` | 16px | 400 | 28px | Default readable UI/body text |
| `--ux-type-body-sm` | 14px | 400 | 24px | Secondary/supporting text |
| `--ux-type-caption` | 12px | 400 | 20px | Metadata/caption only; never primary information or critical financial warning |
| `--ux-type-label` | 14px | 500 | 22px | Form/control labels, short navigation metadata |
| `--ux-type-button` | 14px | 600 | 22px | Button/action text |
| `--ux-type-table-head` | 13px | 600 | 20px | Table column headers |
| `--ux-type-table-cell` | 14px | 400 | 22px | Table cell text |
| `--ux-type-number-lg` | 32px | 600 | 40px | Primary KPI / financial amount |
| `--ux-type-number` | 16px | 500 | 24px | Standard monetary/numeric value |
| `--ux-type-number-sm` | 14px | 500 | 22px | Dense supporting numeric value |

## Hierarchy rules
1. One `Page Title` per page-level surface by default.
2. `Display` is exceptional; it must not compete with Page Title or duplicate the same information.
3. Section Title > Card Title > Body hierarchy must remain visually and semantically consistent.
4. Body is the default reading size. Body Small and Caption are supporting roles, not a density shortcut.
5. Critical instructions, errors, warnings, money-at-risk statements and primary actions must not be rendered as Caption.
6. Bold 700 is reserved mainly for Display/Page Title and exceptional emphasis; long Arabic paragraphs remain Regular 400.
7. Do not create hierarchy only through color; role, weight, size and content semantics must agree.

## Numeric and financial typography
- Financial values use IBM Plex Sans Arabic; no alternate numeral font is approved.
- Apply `font-variant-numeric: tabular-nums;` where aligned comparison matters (KPIs, tables, repeated amounts, percentages).
- Numeric spans that contain Western/Arabic digits, decimal separators, currency abbreviations or signs should use directional isolation (`dir="ltr"` or CSS `unicode-bidi:isolate`) where necessary while the surrounding UI remains RTL.
- Currency label and amount must not wrap into ambiguous order; exact component layout is deferred to component/table phases.
- Negative/positive/risk meaning must not rely on color alone.
- Number formatting, decimal precision and currency copy are content/data rules and may be refined in their governed phase; typography must preserve alignment and readability.

## RTL and Arabic rules
- Default text alignment follows RTL/start; do not hard-code right/left where logical `start/end` works.
- Arabic headings and paragraphs must preserve natural word order and avoid artificial letter-spacing.
- Latin IDs, codes, URLs and numeric runs require bidi isolation when embedded in Arabic sentences.
- Avoid all-caps transformations as a hierarchy mechanism.
- Maintain readable Arabic line-height; line-height must never be compressed below the approved role.

## Desktop / Mobile readability boundary
- The role names and semantic hierarchy remain identical across Desktop and Mobile.
- P09 approves no separate mobile font family or duplicate type system.
- Later responsive phases may map a role to a smaller approved role only when space requires it; they must not invent new sizes.
- Display should be used sparingly on compact screens; Page Title remains the normal top-level role.
- Body remains 16/28 as the default reading baseline across target devices.

## Truncation and wrapping
- Titles should wrap naturally before truncation unless the component explicitly requires one line.
- Financial values must preserve full meaning; truncating a monetary amount is prohibited.
- Captions/labels may truncate only when the full value remains programmatically or interactively available in the relevant component phase.

## Implementation reference
```css
:root {
  --ux-font-family-base: "IBM Plex Sans Arabic", sans-serif;

  --ux-type-display-size: 40px;
  --ux-type-display-weight: 700;
  --ux-type-display-line: 52px;

  --ux-type-page-title-size: 32px;
  --ux-type-page-title-weight: 700;
  --ux-type-page-title-line: 44px;

  --ux-type-section-title-size: 24px;
  --ux-type-section-title-weight: 600;
  --ux-type-section-title-line: 34px;

  --ux-type-card-title-size: 18px;
  --ux-type-card-title-weight: 600;
  --ux-type-card-title-line: 28px;

  --ux-type-body-lg-size: 18px;
  --ux-type-body-lg-weight: 400;
  --ux-type-body-lg-line: 30px;
  --ux-type-body-size: 16px;
  --ux-type-body-weight: 400;
  --ux-type-body-line: 28px;
  --ux-type-body-sm-size: 14px;
  --ux-type-body-sm-weight: 400;
  --ux-type-body-sm-line: 24px;
  --ux-type-caption-size: 12px;
  --ux-type-caption-weight: 400;
  --ux-type-caption-line: 20px;
  --ux-type-label-size: 14px;
  --ux-type-label-weight: 500;
  --ux-type-label-line: 22px;
  --ux-type-button-size: 14px;
  --ux-type-button-weight: 600;
  --ux-type-button-line: 22px;
  --ux-type-table-head-size: 13px;
  --ux-type-table-head-weight: 600;
  --ux-type-table-head-line: 20px;
  --ux-type-table-cell-size: 14px;
  --ux-type-table-cell-weight: 400;
  --ux-type-table-cell-line: 22px;
  --ux-type-number-lg-size: 32px;
  --ux-type-number-lg-weight: 600;
  --ux-type-number-lg-line: 40px;
  --ux-type-number-size: 16px;
  --ux-type-number-weight: 500;
  --ux-type-number-line: 24px;
  --ux-type-number-sm-size: 14px;
  --ux-type-number-sm-weight: 500;
  --ux-type-number-sm-line: 22px;
}

.ux-number {
  font-variant-numeric: tabular-nums;
  unicode-bidi: isolate;
}
```

## Phase boundaries
- UX-P10 owns iconography.
- UX-P11 owns layout/grid/spacing composition.
- UX-P12 maps typography roles into components.
- UX-P19 governs responsive behavior without inventing new typography values.
- UX-P20/21 apply label/table typography to forms and data surfaces.
- UX-P26 certifies accessibility in implementation.
- UX-P27 owns final UX copy and terminology.
