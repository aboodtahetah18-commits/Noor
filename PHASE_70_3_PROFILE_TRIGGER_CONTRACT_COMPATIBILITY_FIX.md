# P70.3 — Profile Trigger Contract Compatibility Fix

## Cause
P70.2 intentionally removed the profile/avatar trigger from desktop, tablet, and mobile headers, but legacy quality gates P55 and P49.13 still required the old header profile trigger contract.

## Repair
- Updated P55 verification to assert that header profile wiring and profile triggers are intentionally absent.
- Kept profile/account settings reachable from `/settings`.
- Updated P49.13 to validate the mobile brand/dashboard link instead of the removed profile trigger.
- No runtime business logic, database schema, routes, authentication, or financial rules changed.

## Expected result
The quality gate now matches the approved P70.2 UI behavior rather than forcing the removed avatar/profile control back into the interface.
