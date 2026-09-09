# P70.4 — Navigation Profile Contract Cleanup

## Cause
P70.2 intentionally removed profile/avatar triggers from desktop, tablet, and mobile headers. Three legacy tests still asserted the old JSX contract where `DesktopTopNav` and `TabletTopNav` received `profile={headerProfile}`.

## Repair
Updated only the stale test expectations to the current approved header contract:

- `<DesktopTopNav />`
- `<TabletTopNav />`
- `<MobileBottomNav />`

The tests continue to verify dedicated navigation shells for desktop/tablet/mobile and all existing accessibility/responsive requirements.

## Scope
No profile trigger was restored. No financial logic, database schema, routes, authentication, or runtime behavior changed.
