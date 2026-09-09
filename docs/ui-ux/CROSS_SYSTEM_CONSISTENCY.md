# Cross-System Consistency — UX-P28

PHASE: UX-P28
STATUS: APPROVED
DECISION: DEC-UI-031

## Purpose
This is the final pre-pixel synchronization contract. It verifies that approved P07–P27 systems describe one product language across Desktop and Mobile rather than parallel local implementations.

## Source-of-truth stack
1. P07 Visual Identity Foundation
2. P08 Design Tokens
3. P09 Typography
4. P10 Iconography
5. P11 Grid & Spacing
6. P12 Component System
7. P13–P19 Layout/Screen/Responsive systems
8. P20 Forms & Inputs
9. P21 Tables & Data
10. P22 Navigation
11. P23 Notifications & Feedback
12. P24 States
13. P25 Motion
14. P26 Accessibility
15. P27 UX Writing

A later specialized system overrides an earlier generic rule only within its registered domain; it may not introduce conflicting tokens or vocabulary.

## Component consistency
- One component family per interaction concept; local duplicate families are prohibited.
- Variants and states come from P12/P24, not page-specific CSS invention.
- Button, field, alert, table, modal/sheet and status meanings remain stable across pages.
- Desktop/Mobile may compose components differently but component semantics stay equivalent.

## Color consistency
Only P07/P08 governed colors/aliases are valid:
- Financial Ink `#0B1220`
- Advisor Blue `#2563EB`
- Signal Cyan `#06B6D4`
- Canvas `#F8FAFC`
- White `#FFFFFF`
- Slate `#475569`
- Success `#15803D`
- Warning `#B45309`
- Error `#B42318`

No legacy Ejlal palette, arbitrary hue, local semantic color or colored shadow is authorized.

## Typography consistency
- IBM Plex Sans Arabic only.
- Roles/weights/line-heights follow P09.
- Financial numerals follow tabular/bidi rules.
- No local font-size invention to solve layout issues.

## Spacing consistency
- 4px P08 rhythm and P11 semantic spacing are authoritative.
- Page padding, section gaps, card/form/table spacing use governed tokens.
- Pixel-level exceptions require change control, not local overrides.

## Icon consistency
- Lucide outline language, 2px stroke, 16/20/24/32 sizes.
- RTL mirroring is semantic, not automatic for non-directional icons.
- Emoji or mixed icon libraries are prohibited.

## Navigation consistency
- P04 IA meaning and P22 navigation contract are authoritative.
- Desktop and Mobile preserve semantic destination equivalence despite different composition.
- Active/back/deep-link behavior remains deterministic.

## Form consistency
- P20 labels, validation, pending/success/error and unsaved-change contracts are universal.
- Same field concept uses the same component, terminology and validation semantics.
- Mobile uses one-column composition by default; Desktop may group fields without changing meaning.

## Table/data consistency
- P21 column/data priority is authoritative.
- Sorting/filter/search/pagination/action semantics are consistent across datasets.
- Mobile transforms to record cards/lists/key-value representations; it does not compress Desktop tables.

## Desktop/Mobile consistency
Must remain identical in:
- product terminology;
- financial meaning and calculations;
- action consequence;
- status/severity meaning;
- permissions;
- accessible names;
- route/deep-link identity where shared.

May differ in:
- shell/navigation composition;
- information density;
- column count;
- overlay type (modal vs sheet/full-page);
- action placement;
- data representation appropriate to viewport.

## Final Design System sync matrix
| Domain | Authority | Sync result |
|---|---|---|
| Identity/colors | P07/P08 | PASS |
| Typography | P09 | PASS |
| Icons | P10 | PASS |
| Grid/spacing | P11 | PASS |
| Components | P12 | PASS |
| Desktop layout/screens | P13–P15 | PASS |
| Mobile layout/screens | P16–P18 | PASS |
| Responsive | P19 | PASS |
| Forms | P20 | PASS |
| Tables/data | P21 | PASS |
| Navigation | P22 | PASS |
| Feedback | P23 | PASS |
| States | P24 | PASS |
| Motion | P25 | PASS |
| Accessibility | P26 | PASS |
| UX Writing | P27 | PASS |

## Legacy cleanup contract
The following legacy patterns discovered in P02 are not valid target-system implementations:
- overlapping `.primary/.primary-button/.primary-link` families;
- fragmented feedback class families;
- arbitrary visual values/late override stacks;
- horizontal-scroll-first mobile data patterns;
- raw technical error terminology;
- Ejlal palette/identity remnants.

P29 must verify the rendered implementation at pixel level. P30 must certify that no Critical/High/open inconsistency remains.
