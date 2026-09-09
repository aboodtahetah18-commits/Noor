# P67 — Decision Workflow Simplification

## Status
SOURCE IMPLEMENTATION COMPLETE

## Scope
This phase reduces cognitive load on the most decision-dense financial screens without changing financial rules, persistence, routes, or authorization.

### Updated screens
- `/reports/future-pressure`
- `/budget/optimizer`
- `/budget/optimizer/review`
- `/cycles/[id]/review`
- `/bank-statements/[id]`

## Implemented
1. Added a reusable `WorkflowStageGuide` component to make the current decision stage visible.
2. Future Pressure:
   - Added a five-stage guide: pressure reading → scenario comparison → package building → approval/execution → outcome measurement.
   - Moved detailed projected-cycle breakdown into progressive disclosure so the primary decision path appears first.
3. Budget Optimizer:
   - Added a four-stage guide: understand deficit → test reductions → route surplus → final review.
   - Moved internal-funding recovery detail behind progressive disclosure.
4. Final Plan Review:
   - Added a four-stage guide focused on review → before/after comparison → surplus routing → approval.
5. Cycle Review:
   - Added a five-stage close workflow.
   - Visually separated cycle closure as a critical action zone.
6. Bank Statement Review:
   - Added a four-stage review workflow.
   - Kept exception decisions prominent.
   - Moved the full analyzed-operations table behind progressive disclosure to reduce initial density.
7. Added responsive styles for the workflow guide and progressive disclosure.

## Non-goals
- No financial business logic changed.
- No database migrations added.
- No route added or removed.
- No authentication changes.
- No automatic financial action added.

## Static verification
- Route integrity: PASS
- UI pages discovered: 67
- P47 closure: PASS
- P64 release-closure contract: PASS

## Runtime verification
Authenticated visual regression on the Netlify deployment is still required after deployment.
