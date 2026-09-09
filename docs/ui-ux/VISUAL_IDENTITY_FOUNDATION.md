# Visual Identity Foundation — UX-P07 (CR-001 Revalidated)

PHASE: UX-P07
STATUS: APPROVED — REVALIDATED UNDER CR-001
DECISION: DEC-UI-010
PRODUCT: المستشار المالي الشخصي — standalone personal product

## Identity Principle
The product identity is an independent personal-finance intelligence system: calm, precise, trustworthy, proactive, and decision-support oriented. The visual language must make financial state, risk, and next action easier to understand without resembling a bank portal, trading terminal, or organizational/charity brand.

## Brand Ownership
- The product is personal and standalone; it is **not affiliated with Ejlal Association or any other organization**.
- No Ejlal logo, color rule, typography rule, or visual asset is authoritative for this product.
- The working product name remains **المستشار المالي الشخصي** until the product owner explicitly approves another brand name.

## Mark / Logo Direction
Until a final proprietary mark asset is supplied, the governed identity direction is:
- Wordmark: `المستشار المالي الشخصي`.
- Optional symbol direction: a minimal abstract **compass + financial path** motif representing orientation, foresight, and controlled progress.
- Geometry: simple, balanced, non-decorative, reproducible at 24px+.
- Prohibited: currency-sign logos, stock-chart clichés, shields/bank columns, charity/association motifs, emoji, gradients used as the only identity cue.
- A final proprietary SVG logo may be introduced later by governed brand-asset approval without reopening UX structure.

## Approved Brand Palette
| Role | Value | Foundation use |
|---|---|---|
| Financial Ink | `#0B1220` | Primary text, navigation structure, high-emphasis surfaces |
| Advisor Blue | `#2563EB` | Primary interactive action, focus, selection, trusted decision cue |
| Signal Cyan | `#06B6D4` | Supporting accent, charts/highlights, non-text emphasis |
| Canvas | `#F8FAFC` | Application background / low-emphasis surface |
| White | `#FFFFFF` | Cards, input surfaces, inverse text on dark/primary surfaces |
| Slate | `#475569` | Secondary readable text / metadata |

### Semantic state palette
| State | Value | Rule |
|---|---|---|
| Success | `#15803D` | Must be paired with success text/icon |
| Warning | `#B45309` | Must be paired with warning/risk text/icon |
| Error / destructive | `#B42318` | Must be paired with explicit destructive/error text/icon |
| Information | `#2563EB` | Must be paired with information text/icon when semantic |

Color never carries state meaning alone.

## Background Foundation
- Default application canvas: `#F8FAFC`.
- Primary content surfaces: `#FFFFFF`.
- High-emphasis/inverse surfaces: `#0B1220`.
- `#2563EB` is the primary action color and may form controlled action surfaces.
- `#06B6D4` is an accent/highlight color, not normal body text on white.

## Text Foundation
- Primary text: `#0B1220`.
- Secondary text: `#475569`.
- Inverse text on Financial Ink / Advisor Blue: `#FFFFFF` where contrast is valid.
- Signal Cyan must not be used for normal small text on white.

## Typography Foundation
**IBM Plex Sans Arabic** is re-approved independently of the superseded Ejlal premise because it provides strong Arabic UI readability, stable numeric presentation, broad weights, and a professional technical tone appropriate to personal finance.
- Approved weights: 400 / 500 / 600 / 700.
- Arabic remains RTL-first.
- Exact type roles remain governed by UX-P09.

## Icon Direction
- Professional outline icon language.
- Simple rounded geometry, no decorative iconography.
- One family across Desktop/Mobile; directional icons respect RTL semantics.
- Lucide remains a candidate and is revalidated in UX-P10.

## Surface Language
- Cards are quiet white surfaces on a light canvas.
- Borders are subtle and functional; shadows are restrained.
- Radius communicates approachability without becoming playful.
- Primary financial numbers receive hierarchy through typography and spacing, not ornamental color.
- Charts use Advisor Blue / Signal Cyan plus semantic colors only when the underlying meaning warrants them.

## Visual Personality
1. **Calm** — no panic, flashing, trading-terminal density, or decorative noise.
2. **Precise** — numerical alignment and unambiguous hierarchy.
3. **Trustworthy** — stable layouts, legible contrast, conservative effects.
4. **Proactive** — risk/next action is surfaced early without alarmist treatment.
5. **Personal** — feels like a private financial workspace, not an institutional portal.
6. **RTL-native** — Arabic composition is first-class.

## Accessibility Foundation
Verified raw-color contrast on white:
- Financial Ink `#0B1220`: ~18.72:1.
- Advisor Blue `#2563EB`: ~5.17:1.
- Slate `#475569`: ~7.58:1.
- Success `#15803D`: ~5.02:1.
- Warning `#B45309`: ~5.02:1.
- Error `#B42318`: ~6.57:1.
- Signal Cyan `#06B6D4`: ~2.43:1 — accent only, not normal text on white.

Full implementation certification remains owned by UX-P26.

## Prohibited Directions
- Ejlal Association branding or any organizational identity assets.
- Neon/trading/gaming aesthetic.
- Arbitrary gradients, colored shadows, or uncontrolled hues.
- Currency-sign/stock-arrow clichés as the primary brand mark.
- Color-only state communication.
- Emoji as product iconography.

## Device Rule
Desktop and Mobile share the identity but remain independent compositions. Identity consistency must not force Mobile to become scaled Desktop.

## Change-control result
CR-001 replaces the historical DEC-UI-001 baseline with this standalone identity. Dependent phases UX-P08–UX-P15 are revalidated sequentially against this foundation.
