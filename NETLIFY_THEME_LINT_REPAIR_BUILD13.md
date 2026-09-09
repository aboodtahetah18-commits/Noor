# Netlify Theme Toggle Lint Repair — Build 13

## Root cause
`src/app/theme-toggle.tsx` called `setTheme(initial)` synchronously inside `useEffect`, which violates the enforced `react-hooks/set-state-in-effect` rule.

## Repair
- Replaced local `useState` synchronization with `useSyncExternalStore`.
- Theme is read from `localStorage` through a stable external-store snapshot.
- Theme changes are synchronized by the native `storage` event plus `mustaqbali:theme-change` for same-tab updates.
- `useEffect` now only synchronizes the DOM (`data-theme` and `color-scheme`) and does not call `setState`.
- Light remains the server/default theme; saved dark preference is restored after hydration.

## Verification
- UI token compliance: PASS — 339 UI source files.
- P47 closure: PASS — 63 protected pages.
- Route integrity: PASS — 67 pages / 123 static internal links.
- Exact lint trigger (`setTheme` inside effect) removed.

No financial logic, routes, database schema, or business rules changed.
