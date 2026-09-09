# Implementation Handoff — Required Before UX-P29 / UX-P30

## Purpose
Implement the approved UX/UI system defined by UX-P07 through UX-P28 in the executable platform. This is an implementation task, not a redesign task.

## Source of truth
Use `/docs/ui-ux/` / this governance package as authoritative. Do not reinterpret or replace approved decisions without a Change Request.

## Required implementation scope
1. Apply the post-CR-001 personal visual identity and approved Design Tokens.
2. Apply approved Typography, Iconography, Grid and Spacing systems.
3. Use the approved Component Architecture rather than parallel/legacy component families.
4. Implement Desktop Layout + Core + Secondary screen contracts.
5. Implement Mobile Layout + Core + Secondary screen contracts independently from Desktop.
6. Apply Responsive Behaviour, Forms, Tables/Data, Navigation, Feedback, States, Motion, Accessibility and UX Writing contracts.
7. Remove or replace legacy visual values and obsolete CSS overrides where they conflict with approved tokens/components.
8. Preserve current product functionality and data behavior unless an approved UX decision explicitly changes interaction behavior.

## Required evidence for resuming UX-P29
Provide one inspectable build/deploy that includes:
- Desktop render for every implemented primary/secondary page.
- Mobile render for every implemented primary/secondary page.
- Loading / Empty / No Results / Error / Success / Disabled states where applicable.
- Modals / Drawers / Bottom Sheets and interactive overlays.
- Current executable source or deploy artifact matching the reviewed build.
- Version/deploy identifier.

## Pixel audit criteria to be checked afterward
- Alignment
- Padding
- Margins
- Baselines
- Icon alignment
- Border thickness
- Radius consistency
- Text wrapping
- Responsive precision
- Final visual polish

## Certification rule
Do not label the platform `UX/UI CERTIFIED` until UX-P29 and UX-P30 have both passed against the implemented build.
